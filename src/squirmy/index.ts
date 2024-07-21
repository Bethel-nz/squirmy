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
