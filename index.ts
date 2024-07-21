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
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
