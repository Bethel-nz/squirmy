# Squirmy ORM

Squirmy is a lightweight, JSON schema-based ORM for PostgreSQL, built using Node.js and pg. It provides a simple way to interact with your database using TypeScript, offering functionality for creating, reading, updating, and deleting records.

## Table of Contents

1. [Schema Definition](#schema-definition)
2. [Usage](#usage)
   - [Initialization](#initialization)
   - [Model Operations](#model-operations)
3. [QueryBuilder Methods](#querybuilder-methods)

## Schema Definition

The schema is defined in a JSON file. Each table is represented by an object with fields, relations, required, and optional properties. Squirmy follows a PostgreSQL JSON-like schema structure.

Example schema (schema/squirmy.json): [Here](./src/example/schema/squirmy.json)

## Usage

### Initialization

To use Squirmy, initialize it with a path to your schema file and PostgreSQL connection options.

```typescript
import Squirmy from 'squirmy';

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

Squirmy provides various methods to interact with your database models. Here's an overview of the available methods and their usage:

## QueryBuilder Methods

### create

Creates a new record in the database.

```typescript
const newUser = await squirmy.models.User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashedpassword',
});
```

### createIndex

Creates an index on a specified field.

```typescript
await squirmy.models.User.createIndex('email', 'BTREE');
```

### delete

Deletes a record by ID.

```typescript
const deletedUser = await squirmy.models.User.delete(1);
```

### deleteMany

Deletes multiple records based on a condition.

```typescript
const deletedCount = await squirmy.models.User.deleteMany({
  status: 'inactive',
});
```

### dropIndex

Drops an index on a specified field.

```typescript
await squirmy.models.User.dropIndex('email');
```

### findAll

Retrieves all records matching specified criteria.

```typescript
const users = await squirmy.models.User.findAll({
  where: { status: 'active' },
  orderBy: 'createdAt',
  limit: 10,
  offset: 0,
});
```

### findAllWithRelations

Retrieves all records with their related data.

```typescript
const usersWithPosts = await squirmy.models.User.findAllWithRelations(
  { where: { status: 'active' } },
  ['posts']
);
```

### findById

Retrieves a record by its ID.

```typescript
const user = await squirmy.models.User.findById(1);
```

### findOne

Retrieves the first record matching specified criteria.

```typescript
const user = await squirmy.models.User.findOne({ email: 'john@example.com' });
```

### paginate

Retrieves records with pagination.

```typescript
const paginatedUsers = await squirmy.models.User.paginate(1, 10, {
  status: 'active',
});
```

### query

Executes a raw SQL query.

```typescript
const results = await squirmy.models.User.query(
  'SELECT * FROM users WHERE age > $1',
  [18]
);
```

### restore

Restores a soft-deleted record.

```typescript
const restoredUser = await squirmy.models.User.restore(1);
```

### softDelete

Marks a record as deleted without removing it from the database.

```typescript
const softDeletedUser = await squirmy.models.User.softDelete(1);
```

### update

Updates a record by ID.

```typescript
const updatedUser = await squirmy.models.User.update(1, { name: 'Jane Doe' });
```

### updateMany

Updates multiple records based on a condition.

```typescript
const updatedCount = await squirmy.models.User.updateMany(
  { status: 'inactive' },
  { status: 'active' }
);
```

### withTransaction

Executes multiple database operations within a transaction.

```typescript
await squirmy.models.User.withTransaction(async (client) => {
  const newUser = await client.query(
    'INSERT INTO users (name) VALUES ($1) RETURNING *',
    ['Alice']
  );
  await client.query('INSERT INTO posts (user_id, title) VALUES ($1, $2)', [
    newUser.rows[0].id,
    'My First Post',
  ]);
});
```

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

#### `async init(): Promise<void>`

**Description:**
Initializes the ORM by reading the schema and setting up the models.

#### `models(): Record<string, QueryBuilder<any>>`

**Returns:**

- `Record<string, QueryBuilder<any>>`: An object containing the models.

**Description:**
Returns an object containing the models, which can be used to interact with the database.

---

This document provides an overview of Squirmy ORM, including installation, schema definition, usage, and the main classes and methods available.
