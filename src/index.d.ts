type SchemaField = string;
type Relation = {
  type: 'hasMany' | 'belongsTo';
  model: string;
  foreignKey: string;
};
type Schema = Record<
  string,
  {
    fields: Record<string, SchemaField>;
    relations?: Record<string, Relation>;
    required?: string[];
    optional?: string[];
  }
>;

type ModelData<T extends keyof Schema> = {
  [K in keyof Schema[T]['fields']]: any;
};

type WhereClause = Record<string, any>;
