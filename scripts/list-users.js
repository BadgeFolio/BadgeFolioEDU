// Script to list all users in the system
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function listUsers() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db();
    const users = database.collection('users');

    // Find users with email containing gcufsd.net
    const usersList = await users.find({ 
      email: { $regex: 'gcufsd.net', $options: 'i' } 
    }).toArray();

    if (usersList.length === 0) {
      console.log('No users with gcufsd.net in their email found.');
      
      // Get collection name for users
      const collections = await database.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
      
      // Count total users
      const totalUsers = await users.countDocuments();
      console.log('Total users in the database:', totalUsers);
      
      // List a few sample users
      const sampleUsers = await users.find().limit(5).toArray();
      sampleUsers.forEach(user => {
        console.log(`User: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
      });
      
      return;
    }

    console.log(`Found ${usersList.length} users with gcufsd.net in their email:`);
    usersList.forEach(user => {
      console.log(`- ${user.name}: ${user.email} (Role: ${user.role})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

listUsers().catch(console.error); 