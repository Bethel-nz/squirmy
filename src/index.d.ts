type SchemaField = string | number | boolean | date;

type Schema = {
  [TableName: string]: {
    fields: {
      [FieldName: string]: SchemaField!;
    };
    relations?: {
      [RelationName: string]: Relation;
    };

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

type Relation = {
  type: 'hasMany' | 'belongsTo' | 'hasOne' | 'manyToMany';
  model: string;
  foreignKey: string;
  junctionTable?: string; // Add this for manyToMany relations
  relatedKey?: string; // Add this for manyToMany relations
};

type ModelData<T extends keyof Schema> = {
  [K in keyof Schema[T]['fields']]: InferModelType<T['fields'][K]>;
};


// Generated types start
type User = {
      id: string;
  name: any;
  email: any;
  password: any;
  createdAt: Date;
  updatedAt: Date;
      relations: {
    posts: { type: 'hasMany'; model: 'Post'; foreignKey: 'userId'; };
    profile: { type: 'hasOne'; model: 'Profile'; foreignKey: 'userId'; };
    roles: { type: 'manyToMany'; model: 'Role'; foreignKey: 'userId'; };
  }
    };

type Post = {
      id: string;
  title: any;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
      relations: {
    author: { type: 'belongsTo'; model: 'User'; foreignKey: 'userId'; };
  }
    };

type Profile = {
      id: string;
  userId: string;
  bio: string;
  avatarUrl: any;
      relations: {
    user: { type: 'belongsTo'; model: 'User'; foreignKey: 'userId'; };
  }
    };

type Role = {
      id: string;
  name: any;
      relations: {
    users: { type: 'manyToMany'; model: 'User'; foreignKey: 'roleId'; };
  }
    };

type ModelTypes = {
    User: User;
  Post: Post;
  Profile: Profile;
  Role: Role;
  };
// Generated types end

undefined

undefined

undefined

undefined

undefined

undefined