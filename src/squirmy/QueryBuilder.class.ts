import { Pool } from 'pg';
import measureExecutionTime from './utils';
import { v4 as uuidv4 } from 'uuid';
export default class QueryBuilder<T extends keyof Schema> {
  protected table: T;
  protected fields: Record<string, SchemaField>;
  protected relations: Record<string, Relation>;
  protected pool: Pool;
  protected required: string[];
  protected optional: string[];
  protected schema: Schema;

  constructor(table: T, pool: Pool, schema: Schema) {
    this.table = table;
    this.schema = schema;
    this.fields = schema[table].fields;
    this.relations = schema[table].relations || {};
    this.pool = pool;
    this.required = schema[table].required || [];
    this.optional = schema[table].optional || [];
  }

  private async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const { rows } = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Query Error:', error);
      throw error;
    }
  }

  private async createTableIfNotExists(): Promise<void> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const fields = this.fields;
        const columns = Object.entries(fields)
          .map(([name, details]) => {
            const type = details;
            return `"${name}" ${type}`;
          })
          .join(', ');

        const notNullConstraints = this.required
          .map((field) => `"${field}" IS NOT NULL`)
          .join(' AND ');

        const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${this.table}" (
          ${columns}${
          notNullConstraints
            ? `, CONSTRAINT ${this.table}_not_null CHECK (${notNullConstraints})`
            : ''
        }
        )
      `;
        await this.query(createTableQuery);
      });
      console.log(`[${this.table}] Create operation took ${executionTime}ms`);
      return result;
    } catch (error) {
      console.error(`[${this.table}] Error creating table:`, error);
      throw new Error(`There was an error creating a new table`);
    }
  }

  async create(
    data: Partial<ModelData<T>>,
    relations?: Record<string, any>
  ): Promise<ModelData<T>> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        await this.createTableIfNotExists();

        this.validateData(data, 'create');

        // Process fields
        const processedData: Record<string, any> = {};
        for (const [field, value] of Object.entries(data)) {
          const fieldType = this.schema[this.table].fields[field];
          if (fieldType === 'uuid' && !value) {
            processedData[field] = uuidv4(); // Assuming you're using the uuid package
          } else if (fieldType === 'serial') {
            // Skip serial fields as they're auto-incremented
          } else if (fieldType === 'integer') {
            processedData[field] = value === undefined ? null : Number(value);
          } else {
            processedData[field] = value;
          }
        }

        const keys = Object.keys(processedData);
        const values = Object.values(processedData);
        const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

        const query = `
        INSERT INTO "${this.table}" (${keys
          .map((key) => `"${key}"`)
          .join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
        const [row] = await this.query(query, values);

        // Handle relations
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
                await this.createRelatedRecords(relation, row.id, relationData);
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
  }

  private async createRelatedRecords(
    relation: Relation,
    parentId: any,
    data: any[] | any
  ) {
    const relatedQueryBuilder = new QueryBuilder(
      relation.model,
      this.pool,
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
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const [row] = await this.query(
          `SELECT * FROM "${this.table}" WHERE id = $1`,
          [id]
        );
        return row || null;
      });
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
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setString = keys
          .map((key, index) => `"${key}" = $${index + 1}`)
          .join(', ');
        const query = `UPDATE "${this.table}" SET ${setString} WHERE id = $${
          keys.length + 1
        } RETURNING *`;
        const [row] = await this.query(query, [...values, id]);
        return row;
      });
      console.log(`[${this.table}] Update operation took ${executionTime}ms`);
      return result;
    } catch (error) {
      console.error(`[${this.table}] Error in update method:`, error);
      throw new Error(`Error in update method`);
    }
  }

  async updateMany(
    where: Partial<ModelData<T>>,
    data: Partial<ModelData<T>>
  ): Promise<number> {
    try {
      const [result, executionTime] = await measureExecutionTime(async () => {
        const setKeys = Object.keys(data);
        const setValues = Object.values(data);
        const whereKeys = Object.keys(where);
        const whereValues = Object.values(where);
        const setString = setKeys
          .map((key, index) => `"${key}" = $${index + 1}`)
          .join(', ');
        const whereString = whereKeys
          .map((key, index) => `"${key}" = $${setKeys.length + index + 1}`)
          .join(' AND ');
        const query = `UPDATE "${this.table}" SET ${setString} WHERE ${whereString}`;
        const { rowCount } = await this.pool.query(query, [
          ...setValues,
          ...whereValues,
        ]);
        return rowCount!;
      });
      console.log(
        `[${this.table}] UpdateMany operation took ${executionTime}ms`
      );
      return result;
    } catch (error) {
      console.error(`[${this.table}] Error in updateMany method:`, error);
      throw new Error(`Error in updateMany method`);
    }
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
