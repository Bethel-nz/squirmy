import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';
import QueryBuilder from './QueryBuilder.class';

export default class Squirmy {
  private pool: Pool;
  public models: Record<string, QueryBuilder<any>>;
  private schema: Schema;

  constructor(options: { schemaPath: string; pool: Pool | PoolConfig }) {
    if (options.pool instanceof Pool) {
      this.pool = options.pool;
    } else {
      this.pool = new Pool(options.pool);
    }
    this.schema = this.loadSchema(options.schemaPath);

    this.models = {};
    const generatedTypes = this.generateTypesFromSchema();
    fs.writeFileSync('generated-types.d.ts', generatedTypes);
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
      return 'any'; // or 'Record<string, any>' if you prefer
    } else {
      return 'any'; // Fallback for unknown types
    }
  }

  private generateTypesFromSchema() {
    const types: string[] = [];

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

      types.push(`
            export type ${modelName} = {
              ${fields}
              ${relations ? `relations: {\n    ${relations}\n  }` : ''}
            };
          `);
    }

    types.push(`
        export type ModelTypes = {
          ${Object.keys(this.schema)
            .map((modelName) => `${modelName}: ${modelName};`)
            .join('\n  ')}
        };
`);

    return types.join('\n');
  }
  private initializeModels() {
    for (const modelName in this.schema) {
      this.models[modelName] = new QueryBuilder(
        modelName,
        this.pool,
        this.schema
      );
      Object.defineProperty(this, modelName, {
        get: () => this.models[modelName],
      });
    }
  }
}
