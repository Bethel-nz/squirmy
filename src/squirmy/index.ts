import { Pool } from 'pg';
import type { PoolConfig, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';
import QueryBuilder from './QueryBuilder.class';

export default class Squirmy {
  private pool: Pool;
  public models: {
    [K in keyof ModelTypes]: QueryBuilder<K>;
  };
  private schema: Schema;

  constructor(options: { schemaPath: string; pool: Pool | PoolConfig }) {
    if (options.pool instanceof Pool) {
      this.pool = options.pool;
    } else {
      this.pool = new Pool(options.pool);
    }
    this.schema = this.loadSchema(options.schemaPath);

    this.models = {} as {
      [K in keyof ModelTypes]: QueryBuilder<K>;
    };
    const generatedTypes = this.generateTypesFromSchema();
    const typesFilePath = path.join(__dirname, '..', 'index.d.ts');
    fs.appendFileSync(typesFilePath, '\n\n' + generatedTypes);
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

  private generateTypesFromSchema() {
    console.log('Generating Types from Schema....');
    const types: string[] = [];
    const typesFilePath = path.join(__dirname, '..', 'index.d.ts');
    let existingContent = '';

    if (fs.existsSync(typesFilePath)) {
      existingContent = fs.readFileSync(typesFilePath, 'utf-8');
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
              return `${relationName}: { type: '${relation.type}'; model: '${relation.model}'; foreignKey: '${relation.foreignKey}'; };`;
            })
            .join('\n    ')
        : '';

      const typeDefinition = `type ${modelName} = {
      ${fields}
      ${relations ? `relations: {\n    ${relations}\n  }` : ''}
    };`;

      if (!existingContent.includes(`type ${modelName} =`)) {
        types.push(typeDefinition);
      }
    }

    const modelTypesDefinition = `type ModelTypes = {
    ${Object.keys(this.schema)
      .map((modelName) => `${modelName}: ${modelName};`)
      .join('\n  ')}
  };`;

    if (!existingContent.includes('type ModelTypes =')) {
      types.push(modelTypesDefinition);
    }

    if (types.length > 0) {
      const clearedContent = existingContent.replace(
        /\/\/ Generated types start[\s\S]*\/\/ Generated types end/,
        ''
      );

      const updatedContent = `${clearedContent.trim()}\n\n// Generated types start\n${types.join(
        '\n\n'
      )}\n// Generated types end\n`;

      fs.writeFileSync(typesFilePath, updatedContent);
      console.log('Types generated and written to file.');
    } else {
      console.log('No changes in types detected. File not updated.');
    }
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
        const result = await this.query(`DROP TABLE IF EXISTS "${modelName}";`);
        console.log(`Table "${modelName}" has been deleted successfully.`);
      } catch (error) {
        console.error(`Error deleting table "${modelName}":`, error);
      }
    }
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
}
