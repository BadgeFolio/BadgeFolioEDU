import mongoose from 'mongoose';

// Better detection of build/static generation phases
const isBuildPhase = process.env.NODE_ENV === 'production' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'production');

// Try to get MongoDB URI from different sources with a fallback for build environment
const MONGODB_URI = process.env.MONGODB_URI || 
  (isBuildPhase ? 'mongodb://placeholder-for-build:27017/placeholder-db' : '');

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

  // For build process or static generation, just return mongoose without connecting
  if (isBuildPhase) {
    console.warn('Build or static generation detected. Skipping MongoDB connection.');
    return mongoose;
  }

  // Check if we have a MongoDB URI
  if (!MONGODB_URI) {
    console.error('MongoDB URI is not defined! Check your environment variables.');
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        'Please add your Mongo URI to .env.local'
      );
    } else {
      // In production but not build phase, log but don't crash
      console.warn('Missing MongoDB URI in production environment. Some features may not work.');
      return mongoose;
    }
  }

  // If not in build phase and we have a MongoDB URI, connect
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