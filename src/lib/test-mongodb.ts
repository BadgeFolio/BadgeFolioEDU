import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

interface Collection {
  name: string;
}

async function testConnection() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }

    console.log('Attempting to connect to MongoDB...');
    
    const connection = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('Successfully connected to MongoDB!');
    
    // List all collections to verify access
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map((c: Collection) => c.name));
    } else {
      console.log('No database connection available');
    }

    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

testConnection(); 