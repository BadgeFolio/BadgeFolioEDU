import mongoose from 'mongoose';

// Try to get MongoDB URI from different sources with a fallback for build environment
const MONGODB_URI = process.env.MONGODB_URI || 
  (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build' 
    ? 'mongodb://placeholder-for-build:27017/placeholder-db' 
    : '');

// Interface for global mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Add to global TypeScript definitions
declare global {
  var mongoose: MongooseCache | undefined;
}

// Initialize the cached connection
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  // If connection exists, return it
  if (cached.conn) {
    return cached.conn;
  }

  // For next.js build process, just return mongoose without connecting
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('MongoDB URI not needed during build phase. Skipping connection.');
    return mongoose;
  }

  // Check if we have a MongoDB URI
  if (!MONGODB_URI) {
    console.error('MongoDB URI is not defined! Check your environment variables.');
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local'
      );
    } else {
      // In production but not build phase, log but don't crash
      console.warn('Missing MongoDB URI in production. Some features may not work.');
      return mongoose;
    }
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    try {
      console.log('Connecting to MongoDB...');
      cached.promise = mongoose.connect(MONGODB_URI, opts)
        .then((mongoose) => {
          console.log('MongoDB connected successfully');
          return mongoose;
        });
    } catch (err) {
      console.error('MongoDB connection error:', err);
      // Reset promise so connection can be retried
      cached.promise = null;
      throw err;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection failed:', e);
    throw e;
  }

  return cached.conn;
}

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

export default dbConnect; 