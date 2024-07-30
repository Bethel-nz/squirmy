import Squirmy from './src/squirmy';
import { v4 as uuidv4 } from 'uuid';

const squirmy = new Squirmy({
  schemaPath: './schema/squirmy.json',
  pool: {
    user: 'postgres',
    password: '5437',
    database: 'squirmy-db',
    host: 'localhost',
    port: 5437,
    max: 20,
    idleTimeoutMillis: 30000,
  },
});

async function main() {
  try {
    console.log('Available Models:', Object.keys(squirmy.models));

    //clear table first:
    const clearedTableResult = await squirmy.dropTables();
    console.log('Cleared Tables:', clearedTableResult);

    await sleep(5000);

    // Create a new user
    const newUser = await squirmy.models.User.create({
      id: uuidv4(),
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword',
    });
    console.log('Created User:', newUser);

    // Create a profile for the user
    const newProfile = await squirmy.models.Profile.create({
      id: uuidv4(),
      userId: newUser.id,
      bio: 'I am a software developer',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
    console.log('Created Profile:', newProfile);

    // Create a post for the user
    const newPost = await squirmy.models.Post.create({
      id: uuidv4(),
      title: 'My First Post',
      content: 'Hello, world!',
      userId: newUser.id,
    });
    console.log('Created Post:', newPost);

    // Create a role
    const newRole = await squirmy.models.Role.create({
      id: uuidv4(),
      name: 'Admin',
    });
    console.log('Created Role:', newRole);

    // Assign role to user (simulating many-to-many relationship)
    const userRoleInsert = await squirmy.query(
      'INSERT INTO "UserRoles" ("userId", "roleId") VALUES ($1, $2)',
      [newUser.id, newRole.id]
    );
    console.log('Assigned Role to User', userRoleInsert.rowCount);

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
      name: 'John Smith',
    });
    console.log('Updated User:', updatedUser);

    // Find all posts for the user
    const userPosts = await squirmy.models.Post.findAll({
      where: { userId: newUser.id },
    });
    console.log('User Posts:', userPosts);

    // Update post
    const updatedPost = await squirmy.models.Post.update(newPost.id, {
      title: 'Updated Post Title',
    });
    console.log('Updated Post:', updatedPost);

    // Find user's profile
    const userProfile = await squirmy.models.Profile.findOne({
      userId: newUser.id,
    });
    console.log('User Profile:', userProfile);

    // Update profile
    const updatedProfile = await squirmy.models.Profile.update(newProfile.id, {
      bio: 'Updated bio',
    });
    console.log('Updated Profile:', updatedProfile);

    // Find all roles
    const allRoles = await squirmy.models.Role.findAll();
    console.log('All Roles:', allRoles);

    // Delete post
    const deletedPost = await squirmy.models.Post.delete(newPost.id);
    console.log('Deleted Post:', deletedPost);

    // Delete user's role assignment

    // Delete profile
    const deletedProfile = await squirmy.models.Profile.delete(newProfile.id);
    console.log('Deleted Profile:', deletedProfile);

    // Delete user
    const deletedUser = await squirmy.models.User.delete(newUser.id);
    console.log('Deleted User:', deletedUser);

    // Delete role
    const deletedRole = await squirmy.models.Role.delete(newRole.id);
    console.log('Deleted Role:', deletedRole);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// async function main() {
//   try {
//     console.log('Available Models:', Object.keys(squirmy.models));

//     if (!squirmy.models.User || !squirmy.models.Car) {
//       throw new Error('User or Car model is not available');
//     }

//     // Create a new user
//     const newUser = await squirmy.models.User.create({
//       name: 'John Doe',
//       email: 'john@example.com',
//       password: 'hashedpassword',
//     });
//     console.log('Created User:', newUser);

//     // Find user by ID
//     const userById = await squirmy.models.User.findById(newUser.id);
//     console.log('Found User by ID:', userById);

//     // Find one user by criteria
//     const userByEmail = await squirmy.models.User.findOne({
//       email: 'john@example.com',
//     });
//     console.log('Found User by Email:', userByEmail);

//     // Update user
//     const updatedUser = await squirmy.models.User.update(newUser.id, {
//       name: 'Jane Doe',
//     });
//     console.log('Updated User:', updatedUser);

//     // Create another user
//     const anotherUser = await squirmy.models.User.create({
//       name: 'Alice Smith',
//       email: 'alice@example.com',
//       password: 'anotherpassword',
//     });
//     console.log('Created Another User:', anotherUser);

//     // Update multiple users
//     const updatedCount = await squirmy.models.User.updateMany(
//       { email: 'alice@example.com' },
//       { name: 'Alice Johnson' }
//     );
//     console.log('Updated Multiple Users Count:', updatedCount);

//     // Delete a user
//     const deletedUser = await squirmy.models.User.delete(newUser.id);
//     console.log('Deleted User:', deletedUser);

//     // Delete multiple users
//     const deleteManyCount = await squirmy.models.User.deleteMany({
//       email: 'alice@example.com',
//     });
//     console.log('Deleted Multiple Users Count:', deleteManyCount);

//     // Create a new car
//     const newCar = await squirmy.models.Car.create({
//       make: 'Toyota',
//       model: 'Corolla',
//       year: 2020,
//     });
//     console.log('Created Car:', newCar);

//     // Find car by ID
//     const carById = await squirmy.models.Car.findById(newCar.id);
//     console.log('Found Car by ID:', carById);

//     // Find one car by criteria
//     const carByModel = await squirmy.models.Car.findOne({ model: 'Corolla' });
//     console.log('Found Car by Model:', carByModel);

//     // Update car
//     const updatedCar = await squirmy.models.Car.update(newCar.id, {
//       model: 'Camry',
//     });
//     console.log('Updated Car:', updatedCar);

//     // Create another car
//     const anotherCar = await squirmy.models.Car.create({
//       make: 'Honda',
//       model: 'Civic',
//       year: 2018,
//     });
//     console.log('Created Another Car:', anotherCar);

//     // Update multiple cars
//     const updatedCarCount = await squirmy.models.Car.updateMany(
//       { make: 'Honda' },
//       { year: 2019 }
//     );
//     console.log('Updated Multiple Cars Count:', updatedCarCount);

//     // Delete a car
//     const deletedCar = await squirmy.models.Car.delete(newCar.id);
//     console.log('Deleted Car:', deletedCar);

//     // Delete multiple cars
//     const deleteManyCarCount = await squirmy.models.Car.deleteMany({
//       make: 'Honda',
//     });
//     console.log('Deleted Multiple Cars Count:', deleteManyCarCount);

//     const allUser = await squirmy.models.User.findAll();

//     console.log('All Users:', allUser);
//   } catch (error: any) {
//     console.error('Error:', error.message);
//   }
// }

// main();

main();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(
      () => resolve(console.log(`Sleeping for ${ms} seconds.....`)),
      ms
    )
  );
}
