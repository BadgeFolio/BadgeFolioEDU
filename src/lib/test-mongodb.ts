import mongoose from 'mongoose';

async function testConnection() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string:', MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@')); // Hide credentials in logs

    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');

    // Test database access
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
    } else {
      console.log('No database connection available');
    }

    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

testConnection(); 