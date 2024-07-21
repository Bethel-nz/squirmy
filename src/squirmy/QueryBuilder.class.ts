import { Pool } from 'pg';

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
  }

  async create(data: Partial<T>): Promise<T> {
    await this.createTableIfNotExists(); // Ensure table exists before inserting data

    this.validateData(data);
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = await keys
      .map((_, index) => `$${index + 1}`)
      .join(', ');

    const query = `
      INSERT INTO "${this.table}" (${await keys
      .map((key) => `"${key}"`)
      .join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const [row] = await this.query(query, values);
    return row;
  }

  async findById(id: number): Promise<ModelData<T> | null> {
    const [row] = await this.query(
      `SELECT * FROM "${this.table}" WHERE id = $1`,
      [id]
    );
    return row || null;
  }

  async findOne(where: WhereClause): Promise<ModelData<T> | null> {
    const whereConditions = Object.entries(where)
      .map(([key], index) => `"${key}" = $${index + 1}`)
      .join(' AND ');
    const query = `SELECT * FROM "${this.table}" WHERE ${whereConditions} LIMIT 1`;
    const [row] = await this.query(query, Object.values(where));
    return row || null;
  }

  async update(id: number, data: Partial<ModelData<T>>): Promise<ModelData<T>> {
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
  }

  async updateMany(
    where: WhereClause,
    data: Partial<ModelData<T>>
  ): Promise<number> {
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
  }

  async delete(id: number): Promise<ModelData<T> | null> {
    const [row] = await this.query(
      `DELETE FROM "${this.table}" WHERE id = $1 RETURNING *`,
      [id]
    );
    return row || null;
  }

  async deleteMany(where: WhereClause): Promise<number> {
    const whereConditions = Object.entries(where)
      .map(([key], index) => `"${key}" = $${index + 1}`)
      .join(' AND ');
    const query = `DELETE FROM "${this.table}" WHERE ${whereConditions}`;
    const { rowCount } = await this.pool.query(query, Object.values(where));
    return rowCount!;
  }

  private validateData(data: Partial<ModelData<T>>): void {
    const missingRequired = this.required.filter((field) => !(field in data));
    if (missingRequired.length > 0) {
      throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
    }

    const invalidFields = Object.keys(data).filter(
      (field) => !this.fields[field] && !this.optional.includes(field)
    );
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
    }
  }
}
