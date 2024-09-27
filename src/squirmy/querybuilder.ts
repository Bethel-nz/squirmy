import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import NodeCache from 'node-cache';
import measureExecutionTime from './utils';

export default class QueryBuilder<T extends keyof Schema> {
  protected table: T;
  protected fields: Record<string, SchemaField>;
  protected relations: Record<string, Relation>;
  protected pool: Pool | PoolClient;
  protected required: string[];
  protected optional: string[];
  protected schema: Schema;
  private cache: NodeCache;

  constructor(table: T, pool: Pool, schema: Schema) {
    this.table = table;
    this.schema = schema;
    this.fields = schema[table].fields;
    this.relations = schema[table].relations || {};
    this.pool = pool;
    this.required = schema[table].required || [];
    this.optional = schema[table].optional || [];
    this.cache = new NodeCache({ stdTTL: 600 }); // Cache with 10 minutes TTL
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const { rows } = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Query Error:', error);
      throw error;
    }
  }
  private sqlTypeFromSchemaType(schemaType: string): string {
    switch (schemaType.toLowerCase()) {
      case 'varchar':
      case 'text':
      case 'uuid':
        return 'VARCHAR';
      case 'integer':
      case 'serial':
        return 'INTEGER';
      case 'float':
      case 'real':
      case 'double precision':
        return 'FLOAT';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'timestamp':
        return 'TIMESTAMP';
      case 'json':
      case 'jsonb':
        return 'JSONB';
      default:
        return 'TEXT'; // Default to TEXT for unknown types
    }
  }

  private async createTableIfNotExists(): Promise<void> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const columns = Object.entries(this.fields)
          .map(([fieldName, fieldType]) => {
            let columnDef = `"${fieldName}" ${this.sqlTypeFromSchemaType(
              fieldType
            )}`;
            if (fieldName === 'id') {
              columnDef += ' PRIMARY KEY';
            } else if (this.required.includes(fieldName)) {
              columnDef += ' NOT NULL';
            } else if (fieldName === 'createdAt' || fieldName === 'updatedAt') {
              columnDef += ' DEFAULT now()';
            }
            return columnDef;
          })
          .join(', ');

        const foreignKeyConstraints = Object.entries(this.relations)
          .filter(([, relation]) => relation.type === 'belongsTo')
          .map(([relationName, relation]) => {
            const foreignKeyField = this.fields[relation.foreignKey];
            if (!foreignKeyField) {
              throw new Error(
                `Foreign key column "${relation.foreignKey}" not defined in fields`
              );
            }

            const relatedModelSchema = this.schema[relation.model];
            if (!relatedModelSchema) {
              throw new Error(
                `Related model "${relation.model}" not found in schema`
              );
            }

            const relatedModelPrimaryKey = relatedModelSchema.primaryKey;
            if (!relatedModelPrimaryKey) {
              throw new Error(
                `Primary key for related model "${relation.model}" not defined`
              );
            }

            let constraint = `, FOREIGN KEY ("${
              relation.foreignKey
            }") REFERENCES "${relation.model}" ("${
              relation.references || relatedModelPrimaryKey
            }")`;
            if (relation.onDelete) {
              constraint += ` ON DELETE ${relation.onDelete}`;
            }
            if (relation.onUpdate) {
              constraint += ` ON UPDATE ${relation.onUpdate}`;
            }
            return constraint;
          })
          .join('');

        // Create table query
        const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${this.table}" (
          ${columns}${foreignKeyConstraints}
        )
      `;
        await this.query(createTableQuery);
      });
      console.log(
        `[${this.table}] Create table operation took ${executionTime}ms`
      );
    } catch (error) {
      console.error(`[${this.table}] Error creating table:`, error);
      throw new Error(`There was an error creating a new table`);
    }
  }

  private processFields(data: Partial<ModelData<T>>): Record<string, any> {
    const processedData: Record<string, any> = {};
    for (const [field, value] of Object.entries(data)) {
      const fieldType = this.schema[this.table].fields[field];
      if (fieldType === 'uuid' && !value) {
        processedData[field] = uuidv4();
      } else if (fieldType === 'serial') {
      } else if (fieldType === 'integer') {
        processedData[field] = value === undefined ? null : Number(value);
      } else if (fieldType === 'timestamp' && !value) {
        processedData[field] = new Date();
      } else {
        processedData[field] = value;
      }
    }
    return processedData;
  }

  async withTransaction<R>(
    callback: (client: PoolClient) => Promise<R>
  ): Promise<R> {
    const client = await this.pool.connect();
    if (!client) {
      throw new Error('Failed to connect to the database');
    }
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async create(
    data: Partial<ModelData<T>>,
    relations?: Record<string, any>
  ): Promise<ModelData<T>> {
    return this.withTransaction(async (client) => {
      try {
        const [result, executionTime] = await measureExecutionTime(async () => {
          await this.createTableIfNotExists();

          this.validateData(data, 'create');

          const processedData: Record<string, any> = this.processFields(data);

          const keys = Object.keys(processedData);
          const values = Object.values(processedData);
          const placeholders = keys
            .map((_, index) => `$${index + 1}`)
            .join(', ');

          const query = `
          INSERT INTO "${this.table}" (${keys
            .map((key) => `"${key}"`)
            .join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
          const result = await client.query(query, values);
          const row = result.rows[0];

          if (relations) {
            for (const [relationName, relationData] of Object.entries(
              relations
            )) {
              const relation = this.relations[relationName];
              if (!relation) {
                throw new Error(
                  `Relation "${relationName}" not found in schema for "${this.table}"`
                );
              }

              switch (relation.type) {
                case 'hasMany':
                case 'hasOne':
                  await this.createRelatedRecords(
                    relation,
                    row.id,
                    relationData
                  );
                  break;
                case 'belongsTo':
                  await this.updateForeignKey(relation, row.id, relationData);
                  break;
                case 'manyToMany':
                  await this.createManyToManyRelation(
                    relation,
                    row.id,
                    relationData
                  );
                  break;
              }
            }
          }

          return row;
        });

        console.log(`[${this.table}] Create operation took ${executionTime}ms`);
        return result as ModelData<T>;
      } catch (error) {
        console.error(`[${this.table}] Error in create method:`, error);
        throw new Error(`Error in create method: ${(error as Error).message}`);
      }
    });
  }

  private async createRelatedRecords(
    relation: Relation,
    parentId: any,
    data: any[] | any
  ) {
    const relatedQueryBuilder = new QueryBuilder(
      relation.model,
      this.pool as Pool,
      this.schema
    );
    if (Array.isArray(data)) {
      for (const item of data) {
        await relatedQueryBuilder.create({
          ...item,
          [relation.foreignKey]: parentId,
        });
      }
    } else {
      await relatedQueryBuilder.create({
        ...data,
        [relation.foreignKey]: parentId,
      });
    }
  }

  private async updateForeignKey(
    relation: Relation,
    childId: any,
    parentId: any
  ) {
    const query = `UPDATE "${this.table}" SET "${relation.foreignKey}" = $1 WHERE id = $2`;
    await this.query(query, [parentId, childId]);
  }

  private async createManyToManyRelation(
    relation: Relation,
    sourceId: any,
    targetIds: any[]
  ) {
    if (!relation.junctionTable || !relation.relatedKey) {
      throw new Error(
        `Invalid manyToMany relation configuration for "${relation.model}"`
      );
    }

    for (const targetId of targetIds) {
      const query = `INSERT INTO "${relation.junctionTable}" ("${relation.foreignKey}", "${relation.relatedKey}") VALUES ($1, $2)`;
      await this.query(query, [sourceId, targetId]);
    }
  }

  async findAll(
    options: {
      where?: Partial<ModelData<T>>;
      orderBy?: keyof ModelData<T>;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ModelData<T>[]> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const { where = {}, orderBy, limit, offset } = options;
        let query = `SELECT * FROM "${this.table}"`;
        const params: any[] = [];

        if (Object.keys(where).length > 0) {
          const whereConditions = Object.entries(where)
            .map(([key, value], index) => {
              params.push(value);
              return `"${key}" = $${index + 1}`;
            })
            .join(' AND ');
          query += ` WHERE ${whereConditions}`;
        }

        if (orderBy) {
          query += ` ORDER BY ${String(orderBy)}`;
        }

        if (limit) {
          query += ` LIMIT ${limit}`;
        }

        if (offset) {
          query += ` OFFSET ${offset}`;
        }

        return this.query(query, params);
      });
      console.log(`[${this.table}] FindAll operation took ${executionTime}ms`);
      return result;
    } catch (error) {
      console.error(`[${this.table}] Error in findAll method:`, error);
      throw new Error(`Error in findAll method`);
    }
  }

  async findById(id: number): Promise<ModelData<T> | null> {
    const cacheKey = this.getCacheKey('findById', id);
    const cachedResult = this.cache.get<ModelData<T> | null>(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const [row] = await this.query(
          `SELECT * FROM "${this.table}" WHERE id = $1`,
          [id]
        );
        return row || null;
      });
      if (result) {
        this.cache.set(cacheKey, result);
      }
      console.log(`[${this.table}] FindById operation took ${executionTime}ms`);

      return result;
    } catch (error) {
      console.error(`[${this.table}] Error in findById method:`, error);
      throw new Error(`Error in findById method`);
    }
  }

  async findOne(where: Partial<ModelData<T>>): Promise<ModelData<T> | null> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const whereConditions = Object.entries(where)
          .map(([key], index) => `"${key}" = $${index + 1}`)
          .join(' AND ');
        const query = `SELECT * FROM "${this.table}" WHERE ${whereConditions} LIMIT 1`;
        const [row] = await this.query(query, Object.values(where));
        return row || null;
      });
      console.log(`[${this.table}] FindOne operation took ${executionTime}ms`);
      return result;
    } catch (error) {
      console.error(`[${this.table}] Error in findOne method:`, error);
      throw new Error(`Error in findOne method`);
    }
  }

  async update(id: number, data: Partial<ModelData<T>>): Promise<ModelData<T>> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        this.validatePartialData(data);
        const processedData = this.processFields(data);
        const keys = Object.keys(processedData);
        const values = Object.values(processedData);
        const setString = keys
          .map((key, index) => `"${key}" = $${index + 1}`)
          .join(', ');
        const query = `
        UPDATE "${this.table}" 
        SET ${setString} 
        WHERE id = $${keys.length + 1} 
        RETURNING *
      `;
        const [row] = await this.query(query, [...values, id]);

        if (!row) {
          throw new Error(`Record with id ${id} not found`);
        }

        if (data.relations) {
          for (const [relationName, relationData] of Object.entries(
            data.relations
          )) {
            const relation = this.relations[relationName];
            if (!relation) {
              throw new Error(
                `Relation "${relationName}" not found in schema for "${this.table}"`
              );
            }
            await this.updateRelation(relation, row.id, relationData);
          }
        }

        return row;
      });

      console.log(`[${this.table}] Update operation took ${executionTime}ms`);
      return result;
    } catch (error) {
      console.error(`[${this.table}] Error in update method:`, error);
      throw new Error(`Error in update method: ${(error as Error).message}`);
    }
  }

  async updateMany(
    where: Partial<ModelData<T>>,
    data: Partial<ModelData<T>>
  ): Promise<number> {
    return this.withTransaction(async (client) => {
      try {
        const [result, executionTime] = await measureExecutionTime(async () => {
          this.validatePartialData(data);
          const processedData = this.processFields(data);
          const setKeys = Object.keys(processedData);
          const setValues = Object.values(processedData);
          const whereKeys = Object.keys(where);
          const whereValues = Object.values(where);
          const setString = setKeys
            .map((key, index) => `"${key}" = $${index + 1}`)
            .join(', ');
          const whereString = whereKeys
            .map((key, index) => `"${key}" = $${setKeys.length + index + 1}`)
            .join(' AND ');
          const query = `
          UPDATE "${this.table}"
          SET ${setString}
          WHERE ${whereString}
          RETURNING id
        `;
          const { rows } = await client.query(query, [
            ...setValues,
            ...whereValues,
          ]);
          const updatedIds = rows.map((row) => row.id);

          // Update relations if necessary
          if (this.relations && updatedIds.length > 0) {
            for (const id of updatedIds) {
              for (const [relationName, relation] of Object.entries(
                this.relations
              )) {
                await this.updateRelation(
                  relation,
                  id,
                  data[relationName],
                  client
                );
              }
            }
          }

          return updatedIds.length;
        });

        console.log(
          `[${this.table}] UpdateMany operation took ${executionTime}ms`
        );
        return result;
      } catch (error) {
        console.error(`[${this.table}] Error in updateMany method:`, error);
        throw new Error(
          `Error in updateMany method: ${(error as Error).message}`
        );
      }
    });
  }

  private async updateRelation(
    relation: Relation,
    parentId: any,
    data: any,
    client?: PoolClient
  ) {
    const relatedQueryBuilder = new QueryBuilder(
      relation.model,
      (client || this.pool) as Pool,
      this.schema
    );

    switch (relation.type) {
      case 'hasMany':
      case 'hasOne':
        if (Array.isArray(data)) {
          for (const item of data) {
            await relatedQueryBuilder.create({
              ...item,
              [relation.foreignKey]: parentId,
            });
          }
        } else {
          await relatedQueryBuilder.create({
            ...data,
            [relation.foreignKey]: parentId,
          });
        }
        break;
      case 'belongsTo':
        await this.updateForeignKey(relation, parentId, data);
        break;
      case 'manyToMany':
        await this.updateManyToManyRelation(relation, parentId, data);
        break;
    }
  }
  private async updateManyToManyRelation(
    relation: Relation,
    sourceId: any,
    targetIds: any[]
  ) {
    if (!relation.junctionTable || !relation.relatedKey) {
      throw new Error(
        `Invalid manyToMany relation configuration for "${relation.model}"`
      );
    }

    const existingRelations = await this.query(
      `SELECT "${relation.relatedKey}" FROM "${relation.junctionTable}" WHERE "${relation.foreignKey}" = $1`,
      [sourceId]
    );
    const existingIds = existingRelations.map(
      (row) => row[relation.relatedKey!]
    );

    const toAdd = targetIds.filter((id) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id) => !targetIds.includes(id));

    for (const id of toAdd) {
      await this.query(
        `INSERT INTO "${relation.junctionTable}" ("${relation.foreignKey}", "${relation.relatedKey}") VALUES ($1, $2)`,
        [sourceId, id]
      );
    }

    for (const id of toRemove) {
      await this.query(
        `DELETE FROM "${relation.junctionTable}" WHERE "${relation.foreignKey}" = $1 AND "${relation.relatedKey}" = $2`,
        [sourceId, id]
      );
    }
  }

  async softDelete(id: number): Promise<ModelData<T> | null> {
    const query = `
      UPDATE "${this.table}"
      SET "deletedAt" = NOW()
      WHERE id = $1 AND "deletedAt" IS NULL
      RETURNING *
    `;
    const [row] = await this.query(query, [id]);
    return row || null;
  }

  async restore(id: number): Promise<ModelData<T> | null> {
    const query = `
      UPDATE "${this.table}"
      SET "deletedAt" = NULL
      WHERE id = $1 AND "deletedAt" IS NOT NULL
      RETURNING *
    `;
    const [row] = await this.query(query, [id]);
    return row || null;
  }

  async createIndex(
    fieldName: keyof ModelData<T>,
    indexType: 'BTREE' | 'HASH' = 'BTREE'
  ): Promise<void> {
    const indexName = `idx_${this.table}_${String(fieldName)}`;
    const query = `CREATE INDEX IF NOT EXISTS ${indexName} ON "${
      this.table
    }" USING ${indexType} ("${String(fieldName)}")`;
    await this.query(query);
  }

  async dropIndex(fieldName: keyof ModelData<T>): Promise<void> {
    const indexName = `idx_${this.table}_${String(fieldName)}`;
    const query = `DROP INDEX IF EXISTS ${indexName}`;
    await this.query(query);
  }

  async paginate(
    page: number,
    pageSize: number,
    where: Partial<ModelData<T>> = {}
  ): Promise<PaginationResult<ModelData<T>>> {
    const offset = (page - 1) * pageSize;
    const [data, totalCount] = await Promise.all([
      this.findAll({ where, limit: pageSize, offset }),
      this.count(where),
    ]);

    return {
      data,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  private async count(where: Partial<ModelData<T>> = {}): Promise<number> {
    const whereConditions = Object.entries(where)
      .map(([key], index) => `"${key}" = $${index + 1}`)
      .join(' AND ');
    const query = `SELECT COUNT(*) FROM "${this.table}"${
      whereConditions ? ` WHERE ${whereConditions}` : ''
    }`;
    const [result] = await this.query(query, Object.values(where));
    return parseInt(result.count, 10);
  }

  async findAllWithRelations(
    options: FindAllOptions = {},
    relations: string[] = []
  ): Promise<ModelData<T>[]> {
    const results = await this.findAll(options);
    return this.loadRelations(results, relations);
  }

  private async loadRelations(
    results: ModelData<T>[],
    relations: string[]
  ): Promise<ModelData<T>[]> {
    for (const relation of relations) {
      const relationConfig = this.relations[relation];
      if (!relationConfig) {
        throw new Error(
          `Relation "${relation}" not found in schema for "${this.table}"`
        );
      }

      const relatedIds = results.map(
        (result) => result[relationConfig.foreignKey as keyof ModelData<T>]
      );
      const relatedQueryBuilder = new QueryBuilder(
        relationConfig.model,
        this.pool as Pool,
        this.schema
      );
      const relatedResults = await relatedQueryBuilder.findAll({
        where: { id: relatedIds },
      });

      results = results.map((result) => {
        let relatedData;
        if (
          relationConfig.type === 'hasOne' ||
          relationConfig.type === 'belongsTo'
        ) {
          relatedData = relatedResults.find(
            (related) =>
              related.id ===
              result[relationConfig.foreignKey as keyof ModelData<T>]
          );
        } else if (relationConfig.type === 'hasMany') {
          relatedData = relatedResults.filter(
            (related) => related[relationConfig.foreignKey] === result.id
          );
        }

        return {
          ...result,
          [relation]: relatedData,
        } as ModelData<T>;
      });
    }

    return results;
  }

  private getCacheKey(method: string, ...params: any[]): string {
    return `${this.table}:${method}:${JSON.stringify(params)}`;
  }

  async delete(id: number): Promise<ModelData<T> | null> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const [row] = await this.query(
          `DELETE FROM "${this.table}" WHERE id = $1 RETURNING *`,
          [id]
        );
        return row || null;
      });
      console.log(`[${this.table}] Delete operation took ${executionTime}ms`);
      return result;
    } catch (error) {
      console.error(`[${this.table}] Error in delete method:`, error);
      throw new Error(`Error in delete method`);
    }
  }

  async deleteMany(where: Partial<ModelData<T>>): Promise<number> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const whereConditions = Object.entries(where)
          .map(([key], index) => `"${key}" = $${index + 1}`)
          .join(' AND ');
        const query = `DELETE FROM "${this.table}" WHERE ${whereConditions}`;
        const { rowCount } = await this.pool.query(query, Object.values(where));
        return rowCount!;
      });
      console.log(
        `[${this.table}] DeleteMany operation took ${executionTime}ms`
      );
      return result;
    } catch (error) {
      console.error(`[${this.table}] Error in deleteMany method:`, error);
      throw new Error(`Error in deleteMany method`);
    }
  }
  private validateData(data: Partial<ModelData<T>>, methodName: string): void {
    const missingRequired = this.required.filter((field) => !(field in data));
    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required fields in model "${
          this.table
        }" (method: ${methodName}): ${missingRequired.join(', ')}`
      );
    }

    const invalidFields = Object.keys(data).filter(
      (field) => !this.fields[field] && !this.optional.includes(field)
    );
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
    }
  }

  private validatePartialData(data: Partial<ModelData<T>>): void {
    const modelSchema = this.schema[this.table];
    const invalidFields = Object.keys(data).filter(
      (field) => !(field in modelSchema.fields)
    );

    if (invalidFields.length > 0) {
      throw new Error(
        `Invalid fields in model "${
          this.table
        }" (method: update): ${invalidFields.join(', ')}`
      );
    }
  }
}
