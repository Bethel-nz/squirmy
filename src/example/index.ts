import Squirmy from '../squirmy';
import { v4 as uuidv4 } from 'uuid';

const squirmy = new Squirmy({
  schemaPath: './src/example/schema/squirmy.json',
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

export async function main() {
  try {
    console.log('Available Models:', Object.keys(squirmy.models));

    await squirmy.dropTables();
    console.log('Tables cleared');
    await sleep(5000);

    const user1 = await squirmy.models.User.create({
      id: uuidv4(),
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password_1',
    });
    console.log('Created User 1:', user1);

    const user2 = await squirmy.models.User.create({
      id: uuidv4(),
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'hashed_password_2',
    });
    console.log('Created User 2:', user2);

    const profile1 = await squirmy.models.Profile.create({
      id: uuidv4(),
      userid: await user1.id,
      bio: 'Software developer and coffee enthusiast',
      avatarUrl: 'https://example.com/john.jpg',
    });
    console.log('Created Profile 1:', profile1);

    const profile2 = await squirmy.models.Profile.create({
      id: uuidv4(),
      userid: await user2.id,
      bio: 'UI/UX designer with a passion for user-centric design',
      avatarUrl: 'https://example.com/jane.jpg',
    });
    console.log('Created Profile 2:', profile2);
    if (!user1 || !user2) return;
    const post1 = await squirmy.models.Post.create({
      id: uuidv4(),
      title: 'Getting Started with Squirmy ORM',
      content: 'Squirmy ORM is a powerful and flexible ORM for TypeScript...',
      userid: await user1.id,
    });
    console.log('Created Post 1:', post1);

    const post2 = await squirmy.models.Post.create({
      id: uuidv4(),
      title: 'Advanced Squirmy Techniques',
      content:
        "In this post, we'll explore some advanced features of Squirmy ORM...",
      userid: await user2.id, // Fixed: use userid
    });
    console.log('Created Post 2:', post2);

    const adminRole = await squirmy.models.Role.create({
      id: uuidv4(),
      name: 'Admin',
    });
    console.log('Created Admin Role:', adminRole);

    const userRole = await squirmy.models.Role.create({
      id: uuidv4(),
      name: 'User',
    });
    console.log('Created User Role:', userRole);

    await squirmy.models.UserRoles.create({
      userid: await user1.id,
      roleId: await adminRole.id,
    });
    await squirmy.models.UserRoles.create({
      userid: await user2.id,
      roleId: await userRole.id,
    });
    console.log('Assigned roles to users');

    const comment1 = await squirmy.models.Comment.create({
      id: uuidv4(),
      content: 'Great post! Looking forward to more content.',
      postId: await post1.id,
      userid: await user2.id,
    });
    console.log('Created Comment 1:', comment1);

    const tag1 = await squirmy.models.Tag.create({
      id: uuidv4(),
      name: 'ORM',
    });
    console.log('Created Tag 1:', tag1);

    const tag2 = await squirmy.models.Tag.create({
      id: uuidv4(),
      name: 'TypeScript',
    });
    console.log('Created Tag 2:', tag2);

    await squirmy.models.PostTags.create({
      postId: await post1.id,
      tagId: await tag1.id,
    });
    await squirmy.models.PostTags.create({
      postId: await post1.id,
      tagId: await tag2.id,
    });
    console.log('Assigned tags to post');

    const foundUser = await squirmy.models.User.findById(await user1.id);
    console.log('Found User:', foundUser);

    const userPosts = await squirmy.models.Post.findAll({
      where: { userid: await user1.id },
    });
    console.log('User 1 Posts:', userPosts);

    const updatedUser = await squirmy.models.User.update(await user1.id, {
      name: 'John Doe Jr.',
      email: 'john.jr@example.com',
    });
    console.log('Updated User:', updatedUser);

    const deletedPost = await squirmy.models.Post.delete(await post2.id);
    console.log('Deleted Post:', deletedPost);

    const remainingPosts = await squirmy.models.Post.findAll();
    console.log('Remaining Posts:', remainingPosts);

    const userWithDetails = await squirmy.query(
      `
      SELECT u.*, p.bio, p."avatarUrl", array_agg(r.name) as roles
      FROM "User" u
      LEFT JOIN "Profile" p ON u.id = p."userid"
      LEFT JOIN "UserRoles" ur ON u.id = ur."userid"
      LEFT JOIN "Role" r ON ur."roleId" = r.id
      WHERE u.id = $1
      GROUP BY u.id, p.bio, p."avatarUrl"
    `,
      [await user1.id]
    );
    console.log('User with Details:', userWithDetails.rows[0]);

    // Demonstrate updateMany
    // const updatedPostCount = await squirmy.models.Post.updateMany(
    //   { userid: await user1.id },
    //   { content: 'Updated content for all posts by user 1' }
    // );
    // console.log('Updated Post Count:', updatedPostCount);

    // Demonstrate deleteMany
    const deletedCommentCount = await squirmy.models.Comment.deleteMany({
      postId: await post1.id,
    });
    console.log('Deleted Comment Count:', deletedCommentCount);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await squirmy.close();
  }
}

function sleep(ms: number = 2000): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(console.log(`Sleeping for ${ms}....`)), ms)
  );
}
