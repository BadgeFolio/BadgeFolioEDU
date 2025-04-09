import mongoose from 'mongoose';
import { isBuildPhase, env } from '@/lib/env';

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

  const mongoUri = env.MONGODB_URI;
  console.log(`MongoDB URI defined: ${!!mongoUri} (${mongoUri ? mongoUri.substring(0, 15) + '...' : 'undefined'})`);
  console.log(`Environment: ${process.env.NODE_ENV}, Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);

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
      console.log('Attempting to connect to MongoDB...');
      cached.promise = mongoose.connect(mongoUri, opts)
        .then((mongoose) => {
          console.log('MongoDB connected successfully');
          return mongoose;
        })
        .catch((err) => {
          console.error('MongoDB connection promise error:', err);
          cached.promise = null;
          throw err;
        });
    } catch (err) {
      console.error('MongoDB connection initialization error:', err);
      // Reset promise so connection can be retried
      cached.promise = null;
      throw err;
    }
  }

  try {
    cached.conn = await cached.promise;
    console.log('MongoDB connection established and cached');
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB await connection failed:', e);
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