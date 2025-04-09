/**
 * MongoDB connection test utility
 * 
 * Use this script to test the MongoDB connection with your current environment
 * Run with: npm run test-mongodb
 */

// First load environment variables
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env.local file found!');
  dotenv.config(); // Try default .env
}

// Import after environment variables are loaded
import mongoose from 'mongoose';
import { env } from './env';

async function testMongoDBConnection() {
  console.log('MongoDB Connection Test');
  console.log('======================');
  
  const mongoUri = process.env.MONGODB_URI || env.MONGODB_URI;
  console.log(`MongoDB URI defined: ${!!mongoUri}`);
  console.log(`URI starts with: ${mongoUri ? mongoUri.substring(0, 20) + '...' : 'undefined'}`);
  
  console.log('\nAttempting to connect...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connection successful!');
    
    // Check database connection
    if (mongoose.connection.db) {
      console.log('\nListing collections:');
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      if (collections.length === 0) {
        console.log('- No collections found (database may be empty)');
      } else {
        collections.forEach(collection => {
          console.log(`- ${collection.name}`);
        });
      }
    } else {
      console.log('❌ Database connection not available');
    }
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState !== 0) {
      console.log('\nClosing connection...');
      await mongoose.connection.close();
      console.log('Connection closed');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  testMongoDBConnection()
    .then(() => {
      console.log('\nTest complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('Test failed with error:', err);
      process.exit(1);
    });
}

export default testMongoDBConnection; 