type SchemaField = string;
type Relation = {
  type: 'hasMany' | 'belongsTo' | 'hasOne' | 'manyToMany';
  model: string;
  foreignKey: string;
  junctionTable?: string; // Add this for manyToMany relations
  relatedKey?: string; // Add this for manyToMany relations
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

type ManyToManyRelation = Relation & {
  type: 'manyToMany';
  junctionTable: string;
  relatedKey: string;
};
