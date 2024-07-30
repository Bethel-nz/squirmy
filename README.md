# Squirmy ORM

Squirmy is a lightweight, schema-based ORM for PostgreSQL, built using Node.js and `pg`. It provides a simple way to interact with your database using TypeScript, offering functionality for creating, reading, updating, and deleting records.

## Table of Contents

1. [Installation](#installation)
2. [Schema Definition](#schema-definition)
3. [Usage](#usage)
   - [Initialization](#initialization)
   - [Model Operations](#model-operations)
     - [Create](#create)
     - [Read](#read)
     - [Update](#update)
     - [Delete](#delete)
4. [QueryBuilder Class](#querybuilder-class)
5. [Squirmy Class](#squirmy-class)

## Installation

```bash
npm install

yarn

bun i
```

## Schema Definition

The schema is defined in a JSON file. Each table is represented by an object with fields, relations, required, and optional properties.

Example schema (schema/squirmy.json):

```json
{
  "User": {
    "fields": {
      "id": "serial",
      "name": "varchar(255)",
      "email": "varchar(255)",
      "password": "varchar(255)"
    },
    "required": ["name", "email", "password"]
  },
  "Car": {
    "fields": {
      "id": "serial",
      "make": "varchar(255)",
      "model": "varchar(255)",
      "year": "int"
    },
    "required": ["make", "model", "year"]
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

```typescript
const deleteManyCount = await squirmy.models.User.deleteMany({
  email: 'john@example.com',
});
console.log('Deleted Multiple Users Count:', deleteManyCount);
```

## QueryBuilder Class

The `QueryBuilder` class provides methods for interacting with a PostgreSQL database using the `pg` library. It abstracts CRUD operations and provides a foundation for working with database models defined in a schema.

### Constructor

```typescript
constructor(table: T, pool: Pool, schema: Schema)
```

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
Validates the data against the schema, ensuring required fields are present and no invalid fields are included.

---

## Squirmy Class

The `Squirmy` class initializes models based on a provided schema and manages the connection pool for interacting with the PostgreSQL database.

### Constructor

```typescript
constructor(options: { schemaPath: string; pool: Pool | PoolConfig })
```

**Parameters:**

- `options` (object):
  - `schemaPath` (string): The path to the schema JSON file.
  - `pool` (Pool | PoolConfig): The PostgreSQL connection pool or configuration object.

**Description:**
Initializes the `Squirmy` instance with the provided schema path and connection pool.

### Methods

#### `private loadSchema(schemaPath: string): Schema`

**Parameters:**

- `schemaPath` (

string): The path to the schema JSON file.

**Returns:**

- `Schema`: The parsed schema object.

**Description:**
Loads and parses the schema from the specified file.

---

#### `private createModels(schema: Schema): void`

**Parameters:**

- `schema` (Schema): The schema object.

**Description:**
Creates models based on the provided schema.

---

### Example

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

async function main() {
  try {
    console.log('Available Models:', Object.keys(squirmy.models));

    if (!squirmy.models.User || !squirmy.models.Car) {
      throw new Error('User or Car model is not available');
    }

    // Create a new user
    const newUser = await squirmy.models.User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword',
    });
    console.log('Created User:', newUser);

    // Find user by ID
    const userById = await squirmy.models.User.findById(newUser.id);
    console.log('Found User by ID:', userById);

    // Find one user by criteria
    const userByEmail = await squirmy.models.User.findOne({
      email: 'john@example.com',
    });
    console.log('Found User by Email:', userByEmail);

    // Update user
    const updatedUser = await squirmy.models.User.update(newUser.id, {
      name: 'Jane Doe',
    });
    console.log('Updated User:', updatedUser);

    // Create another user
    const anotherUser = await squirmy.models.User.create({
      name: 'Alice Smith',
      email: 'alice@example.com',
      password: 'anotherpassword',
    });
    console.log('Created Another User:', anotherUser);

    // Update multiple users
    const updatedCount = await squirmy.models.User.updateMany(
      { email: 'alice@example.com' },
      { name: 'Alice Johnson' }
    );
    console.log('Updated Multiple Users Count:', updatedCount);

    // Delete a user
    const deletedUser = await squirmy.models.User.delete(newUser.id);
    console.log('Deleted User:', deletedUser);

    // Delete multiple users
    const deleteManyCount = await squirmy.models.User.deleteMany({
      email: 'alice@example.com',
    });
    console.log('Deleted Multiple Users Count:', deleteManyCount);

    // Create a new car
    const newCar = await squirmy.models.Car.create({
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
    });
    console.log('Created Car:', newCar);

    // Find car by ID
    const carById = await squirmy.models.Car.findById(newCar.id);
    console.log('Found Car by ID:', carById);

    // Find one car by criteria
    const carByModel = await squirmy.models.Car.findOne({ model: 'Corolla' });
    console.log('Found Car by Model:', carByModel);

    // Update car
    const updatedCar = await squirmy.models.Car.update(newCar.id, {
      model: 'Camry',
    });
    console.log('Updated Car:', updatedCar);

    // Create another car
    const anotherCar = await squirmy.models.Car.create({
      make: 'Honda',
      model: 'Civic',
      year: 2018,
    });
    console.log('Created Another Car:', anotherCar);

    // Update multiple cars
    const updatedCarCount = await squirmy.models.Car.updateMany(
      { make: 'Honda' },
      { year: 2019 }
    );
    console.log('Updated Multiple Cars Count:', updatedCarCount);

    // Delete a car
    const deletedCar = await squirmy.models.Car.delete(newCar.id);
    console.log('Deleted Car:', deletedCar);

    // Delete multiple cars
    const deleteManyCarCount = await squirmy.models.Car.deleteMany({
      make: 'Honda',
    });
    console.log('Deleted Multiple Cars Count:', deleteManyCarCount);

    //Gets all Users
    const allUser = await squirmy.models.User.findAll();
    console.log('All Users:', allUser);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
```
