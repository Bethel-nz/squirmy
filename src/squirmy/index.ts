import { Pool } from 'pg';
import type { PoolConfig, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import QueryBuilder from './querybuilder';

export default class Squirmy {
  private pool: Pool;
  public models: {
    [K in keyof ModelTypes]: QueryBuilder<K>;
  };
  private schema: Schema;
  private schemaPath: string;

  constructor(options: { schemaPath: string; pool: Pool | PoolConfig }) {
    if (options.pool instanceof Pool) {
      this.pool = options.pool;
    } else {
      this.pool = new Pool(options.pool);
    }
    this.schemaPath = options.schemaPath;
    this.schema = this.loadSchema(this.schemaPath);

    this.models = {} as {
      [K in keyof ModelTypes]: QueryBuilder<K>;
    };

    this.initializeModels();
  }

  private loadSchema(schemaPath: string): Schema {
    const fullPath = path.resolve(schemaPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Schema file not found: ${fullPath}`);
    }
    const schemaContent = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(schemaContent);
  }
  private sqlTypeToTsType(sqlType: string): string {
    if (
      sqlType.startsWith('varchar') ||
      sqlType === 'text' ||
      sqlType === 'uuid'
    ) {
      return 'string';
    } else if (
      sqlType === 'int' ||
      sqlType === 'serial' ||
      sqlType === 'bigint'
    ) {
      return 'number';
    } else if (sqlType === 'boolean') {
      return 'boolean';
    } else if (sqlType === 'date' || sqlType === 'timestamp') {
      return 'Date';
    } else if (sqlType === 'json' || sqlType === 'jsonb') {
      return 'any';
    } else {
      return 'any';
    }
  }

  private generateSchemaHash(schema: Schema): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(schema));
    return hash.digest('hex');
  }

  private async generateTypesFromSchema(): Promise<void> {
    console.log('Generating Types from Schema...');
    const types: string[] = [];
    const typesFilePath = path.join(process.cwd(), 'squirmy_types.d.ts');
    const hashFilePath = path.join(process.cwd(), 'squirmy_schema_hash.txt');

    let existingContent = '';
    let existingHash = '';

    if (fs.existsSync(typesFilePath)) {
      existingContent = fs.readFileSync(typesFilePath, 'utf-8');
    }

    if (fs.existsSync(hashFilePath)) {
      existingHash = fs.readFileSync(hashFilePath, 'utf-8');
    }

    const currentSchemaHash = this.generateSchemaHash(this.schema);

    if (existingHash === currentSchemaHash) {
      console.log('No changes in schema detected. Types file not updated.');
      return;
    }
    for (const [modelName, modelSchema] of Object.entries(this.schema)) {
      const fields = Object.entries(modelSchema.fields)
        .map(
          ([fieldName, fieldType]) =>
            `${fieldName}: ${this.sqlTypeToTsType(fieldType)};`
        )
        .join('\n  ');

      const relations = modelSchema.relations
        ? Object.entries(modelSchema.relations)
            .map(([relationName, relation]) => {
              let relationDef = `${relationName}: { type: '${relation.type}'; model: '${relation.model}'; foreignKey: '${relation.foreignKey}';`;
              if (relation.onDelete) {
                relationDef += ` onDelete: '${relation.onDelete}';`;
              }
              if (relation.onUpdate) {
                relationDef += ` onUpdate: '${relation.onUpdate}';`;
              }
              relationDef += ' };';
              return relationDef;
            })
            .join('\n    ')
        : '';

      const typeDefinition = `type ${modelName} = {
      ${fields}
      ${relations ? `relations: {\n    ${relations}\n  }` : ''}
    };`;

      types.push(typeDefinition);
    }

    const modelTypesDefinition = `type ModelTypes = {
    ${Object.keys(this.schema)
      .map((modelName) => `${modelName}: ${modelName};`)
      .join('\n  ')}
  };`;

    types.push(modelTypesDefinition);

    const updatedContent = `// Generated types start\n${types.join(
      '\n\n'
    )}\n// Generated types end\n`;

    fs.writeFileSync(typesFilePath, updatedContent);
    fs.writeFileSync(hashFilePath, currentSchemaHash);
    console.log('Types generated and written to file.');
  }
  public async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return result;
    } catch (error) {
      console.error('Error executing custom query:', error);
      throw error;
    }
  }
  public async dropTables() {
    for (const modelName in this.schema) {
      try {
        const result = await this.query(
          `DROP TABLE IF EXISTS "${modelName}" CASCADE;`
        );
        console.log(`Table "${modelName}" has been deleted successfully.`);
      } catch (error) {
        console.error(`Error deleting table "${modelName}":`, error);
      }
    }
    return `Tables in ${Object.keys(this.schema).join(', ')} deleted`;
  }

  private initializeModels() {
    for (const modelName in this.schema) {
      (this.models as any)[modelName] = new QueryBuilder(
        modelName,
        this.pool,
        this.schema
      );
      Object.defineProperty(this, modelName, {
        get: () => (this.models as any)[modelName],
      });
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database connection pool closed successfully.');
    } catch (error) {
      console.error('Error closing the database connection pool:', error);
      throw error;
    }
  }

  public async init(): Promise<void> {
    console.log('Initializing Squirmy...');
    await this.generateTypesFromSchema();
    console.log('Squirmy initialized successfully.');
  }
}
