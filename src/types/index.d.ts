type SchemaField = string | number | boolean | date;

type Schema = {
  [TableName: string]: {
    fields: {
      [FieldName: string]: SchemaField!;
    };
    relations?: {
      [RelationName: string]: Relation;
    };
    primaryKey: string | string[];

    indexes?: Index[];
    required?: string[];
    optional?: string[];
  };
};

type Index = {
  name: string;
  fields: string[];
  unique?: boolean;
};

type InferFieldType<T extends SchemaField> = T extends 'string'
  ? string
  : T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : T extends 'date'
  ? Date
  : never;

type OnDeleteAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
type OnUpdateAction = 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

type Relation = {
  type: 'hasMany' | 'belongsTo' | 'hasOne' | 'manyToMany';
  model: string;
  foreignKey: string;
  junctionTable?: string;
  relatedKey?: string;
  references: string | number;
  onDelete?: OnDeleteAction;
  onUpdate?: OnUpdateAction;
};

type ModelData<T extends keyof Schema> = {
  [K in keyof Schema[T]['fields']]: InferModelType<T['fields'][K]>;
};
