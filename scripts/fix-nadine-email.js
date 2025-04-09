// Script to fix Nadine's email case issue
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixNadineEmail() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db();
    const users = database.collection('users');

    // Find Nadine's account with case-insensitive search
    const nadine = await users.findOne({ 
      email: { $regex: new RegExp("wengern@gcufsd.net", "i") } 
    });

    if (!nadine) {
      console.log('User not found. Please check the email address.');
      return;
    }

    console.log('Found user:', nadine.name, 'with email:', nadine.email);
    
    // Update the email to lowercase
    const result = await users.updateOne(
      { _id: nadine._id },
      { $set: { email: 'wengern@gcufsd.net' } }
    );

    if (result.modifiedCount === 1) {
      console.log('Successfully updated email for', nadine.name);
    } else {
      console.log('No update was needed or update failed');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

fixNadineEmail().catch(console.error); 