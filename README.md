# Squirmy ORM

Squirmy is a lightweight, schema-based ORM for PostgreSQL, built using Node.js and `pg`. It provides a simple way to interact with your database using TypeScript, offering functionality for creating, reading, updating, and deleting records.

## Table of Contents

1. [Schema Definition](#schema-definition)
2. [Usage](#usage)
   - [Initialization](#initialization)
   - [Model Operations](#model-operations)
     - [Create](#create)
     - [Read](#read)
     - [Update](#update)
     - [Delete](#delete)
3. [QueryBuilder Class](#querybuilder-class)
4. [Squirmy Class](#squirmy-class)

## Schema Definition

The schema is defined in a JSON file. Each table is represented by an object with fields, relations, required, and optional properties. Squirmy follows a PostgreSQL JSON-like schema structure.

Example schema (schema/squirmy.json):

```json
{
  "User": {
    "fields": {
      "id": "uuid",
      "name": "varchar",
      "email": "varchar",
      "password": "varchar",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "relations": {
      "posts": {
        "type": "hasMany",
        "model": "Post",
        "foreignKey": "userid",
        "references": "id"
      },
      "profile": {
        "type": "hasOne",
        "model": "Profile",
        "foreignKey": "userid",
        "references": "id"
      },
      "roles": {
        "type": "manyToMany",
        "model": "Role",
        "foreignKey": "userid",
        "junctionTable": "UserRoles",
        "relatedKey": "roleId",
        "references": "id"
      }
    },
    "required": ["id", "name", "email", "password"],
    "optional": ["createdAt", "updatedAt"],
    "primaryKey": "id"
  },
  "Post": {
    "fields": {
      "id": "uuid",
      "title": "varchar",
      "content": "text",
      "userid": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "relations": {
      "author": {
        "type": "belongsTo",
        "model": "User",
        "foreignKey": "userid",
        "references": "id"
      },
      "comments": {
        "type": "hasMany",
        "model": "Comment",
        "foreignKey": "postId",
        "references": "id"
      },
      "tags": {
        "type": "manyToMany",
        "model": "Tag",
        "foreignKey": "postId",
        "junctionTable": "PostTags",
        "relatedKey": "tagId",
        "references": "id"
      }
    },
    "required": ["id", "title", "content", "userid"],
    "optional": ["createdAt", "updatedAt"],
    "primaryKey": "id"
  },
  "Profile": {
    "fields": {
      "id": "uuid",
      "userid": "uuid",
      "bio": "text",
      "avatarUrl": "varchar"
    },
    "relations": {
      "user": {
        "type": "belongsTo",
        "model": "User",
        "foreignKey": "userid",
        "references": "id"
      }
    },
    "required": ["id", "userid"],
    "optional": ["bio", "avatarUrl"],
    "primaryKey": "id"
  },
  "Role": {
    "fields": {
      "id": "uuid",
      "name": "varchar"
    },
    "relations": {
      "users": {
        "type": "manyToMany",
        "model": "User",
        "foreignKey": "roleId",
        "junctionTable": "UserRoles",
        "relatedKey": "userid",
        "references": "id"
      }
    },
    "required": ["id", "name"],
    "optional": [],
    "primaryKey": "id"
  },
  "Comment": {
    "fields": {
      "id": "uuid",
      "content": "text",
      "postId": "uuid",
      "userid": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "relations": {
      "post": {
        "type": "belongsTo",
        "model": "Post",
        "foreignKey": "postId",
        "references": "id"
      },
      "author": {
        "type": "belongsTo",
        "model": "User",
        "foreignKey": "userid",
        "references": "id"
      }
    },
    "required": ["id", "content", "postId", "userid"],
    "optional": ["createdAt", "updatedAt"],
    "primaryKey": "id"
  },
  "Tag": {
    "fields": {
      "id": "uuid",
      "name": "varchar"
    },
    "relations": {
      "posts": {
        "type": "manyToMany",
        "model": "Post",
        "foreignKey": "tagId",
        "junctionTable": "PostTags",
        "relatedKey": "postId",
        "references": "id"
      }
    },
    "required": ["id", "name"],
    "optional": [],
    "primaryKey": "id"
  },
  "UserRoles": {
    "fields": {
      "userid": "uuid",
      "roleId": "uuid"
    },
    "relations": {
      "user": {
        "type": "belongsTo",
        "model": "User",
        "foreignKey": "userid",
        "references": "id"
      },
      "role": {
        "type": "belongsTo",
        "model": "Role",
        "foreignKey": "roleId",
        "references": "id"
      }
    },
    "required": ["userid", "roleId"],
    "optional": [],
    "primaryKey": ["userid", "roleId"]
  },
  "PostTags": {
    "fields": {
      "postId": "uuid",
      "tagId": "uuid"
    },
    "relations": {
      "post": {
        "type": "belongsTo",
        "model": "Post",
        "foreignKey": "postId",
        "references": "id"
      },
      "tag": {
        "type": "belongsTo",
        "model": "Tag",
        "foreignKey": "tagId",
        "references": "id"
      }
    },
    "required": ["postId", "tagId"],
    "optional": [],
    "primaryKey": ["postId", "tagId"]
  }
}
```

## Usage

### Initialization

To use Squirmy, initialize it with a path to your schema file and PostgreSQL connection options.

```typescript
import Squirmy from './src/squirmy';

const squirmy = new Squirmy({
  schemaPath: './schema/squirmy.json',
  pool: {
    user: 'postgres',
    password: '5437',
    database: 'squirmy-db',
    host: 'localhost',
    port: 5437,
  },
});
```

### Model Operations

#### Create

To create a new record, use the `create` method.

```typescript
const newUser = await squirmy.models.User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashedpassword',
});
console.log('Created User:', newUser);
```

#### Read

To find a record by ID:

```typescript
const userById = await squirmy.models.User.findById(newUser.id);
console.log('Found User by ID:', userById);
```

To find a record by criteria:

```typescript
const userByEmail = await squirmy.models.User.findOne({
  email: 'john@example.com',
});
console.log('Found User by Email:', userByEmail);
```

To find all records with optional filtering, sorting, and pagination:

```typescript
const users = await squirmy.models.User.findAll({
  where: { name: 'John Doe' },
  orderBy: 'id DESC',
  limit: 10,
  offset: 0,
});
console.log('Users:', users);
```

#### Update

To update a record by ID:

```typescript
const updatedUser = await squirmy.models.User.update(newUser.id, {
  name: 'Jane Doe',
});
console.log('Updated User:', updatedUser);
```

To update multiple records:

```typescript
const updatedCount = await squirmy.models.User.updateMany(
  { email: 'john@example.com' },
  { name: 'John Updated' }
);
console.log('Updated Multiple Users Count:', updatedCount);
```

#### Delete

To delete a record by ID:

```typescript
const deletedUser = await squirmy.models.User.delete(newUser.id);
console.log('Deleted User:', deletedUser);
```

To delete multiple records:

````typescript
const deleteManyCount = await squirmy.models.User.deleteMany({
  email: 'john@example.com',
});
console.log('Deleted Multiple Users Count:', deleteManyCount);
``

`

## QueryBuilder Class

The `QueryBuilder` class provides methods for interacting with a PostgreSQL database using the `pg` library. It abstracts CRUD operations and provides a foundation for working with database models defined in a schema.

### Constructor

```typescript
constructor(table: T, pool: Pool, schema: Schema)
````

**Parameters:**

- `table` (T): The name of the table.
- `pool` (Pool): An instance of the PostgreSQL connection pool.
- `schema` (Schema): The schema definition for the database.

**Description:**
Initializes the `QueryBuilder` with the specified table, connection pool, and schema.

### Methods

#### `private async query(sql: string, params: any[] = []): Promise<any[]>`

**Parameters:**

- `sql` (string): The SQL query to execute.
- `params` (any[]): The parameters for the SQL query.

**Returns:**

- `Promise<any[]>`: The rows returned by the query.

**Description:**
Executes the given SQL query with the specified parameters.

---

#### `private async createTableIfNotExists(): Promise<void>`

**Description:**
Creates the table if it does not already exist, based on the schema definition.

---

#### `async create(data: Partial<T>): Promise<T>`

**Parameters:**

- `data` (Partial<T>): The data to insert into the table.

**Returns:**

- `Promise<T>`: The newly created record.

**Description:**
Inserts a new record into the table.

---

#### `async findAll(options: { where?: WhereClause; orderBy?: string; limit?: number; offset?: number } = {}): Promise<ModelData<T>[]>`

**Parameters:**

- `options` (object):
  - `where` (WhereClause): Conditions to filter the records.
  - `orderBy` (string): Field to order the results by.
  - `limit` (number): Maximum number of records to return.
  - `offset` (number): Number of records to skip.

**Returns:**

- `Promise<ModelData<T>[]>`: The list of records.

**Description:**
Retrieves all records that match the specified conditions.

---

#### `async findById(id: number): Promise<ModelData<T> | null>`

**Parameters:**

- `id` (number): The ID of the record to find.

**Returns:**

- `Promise<ModelData<T> | null>`: The record, or `null` if not found.

**Description:**
Finds a record by its ID.

---

#### `async findOne(where: WhereClause): Promise<ModelData<T> | null>`

**Parameters:**

- `where` (WhereClause): Conditions to filter the record.

**Returns:**

- `Promise<ModelData<T> | null>`: The record, or `null` if not found.

**Description:**
Finds a single record that matches the specified conditions.

---

#### `async update(id: number, data: Partial<ModelData<T>>): Promise<ModelData<T>>`

**Parameters:**

- `id` (number): The ID of the record to update.
- `data` (Partial<ModelData<T>>): The data to update.

**Returns:**

- `Promise<ModelData<T>>`: The updated record.

**Description:**
Updates a record by its ID.

---

#### `async updateMany(where: WhereClause, data: Partial<ModelData<T>>): Promise<number>`

**Parameters:**

- `where` (WhereClause): Conditions to filter the records.
- `data` (Partial<ModelData<T>>): The data to update.

**Returns:**

- `Promise<number>`: The number of records updated.

**Description:**
Updates multiple records that match the specified conditions.

---

#### `async delete(id: number): Promise<ModelData<T> | null>`

**Parameters:**

- `id` (number): The ID of the record to delete.

**Returns:**

- `Promise<ModelData<T> | null>`: The deleted record, or `null` if not found.

**Description:**
Deletes a record by its ID.

---

#### `async deleteMany(where: WhereClause): Promise<number>`

**Parameters:**

- `where` (WhereClause): Conditions to filter the records.

**Returns:**

- `Promise<number>`: The number of records deleted.

**Description:**
Deletes multiple records that match the specified conditions.

---

#### `private validateData(data: Partial<ModelData<T>>): void`

**Parameters:**

- `data` (Partial<ModelData<T>>): The data to validate.

**Description:**
Validates the provided data against the schema.

---

#### `private processFields(data: Partial<ModelData<T>>): Record<string, any>`

**Parameters:**

- `data` (Partial<ModelData<T>>): The data to process.

**Returns:**

- `Record<string, any>`: The processed data.

**Description:**
Processes and formats the fields according to their types.

---

## Squirmy Class

The `Squirmy` class initializes and provides access to all models defined in the schema. It handles the creation of `QueryBuilder` instances for each model and manages database connections.

### Constructor

```typescript
constructor(options: { schemaPath: string; pool: PoolConfig })
```

**Parameters:**

- `options` (object):
  - `schemaPath` (string): The path to the schema definition file.
  - `pool` (PoolConfig): PostgreSQL connection options.

**Description:**
Initializes Squirmy with the provided schema path and database connection options.

### Methods

#### `async initialize(): Promise<void>`

**Description:**
Initializes the ORM by reading the schema and setting up the models.

#### `get models(): Record<string, QueryBuilder<any>>`

**Returns:**

- `Record<string, QueryBuilder<any>>`: An object containing the models.

**Description:**
Returns an object containing the models, which can be used to interact with the database.

---

This document provides an overview of Squirmy ORM, including installation, schema definition, usage, and the main classes and methods available.
