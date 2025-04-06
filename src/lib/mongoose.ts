import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true
    };

    try {
      console.log('Attempting to connect to MongoDB...');
      cached.promise = mongoose.connect(MONGODB_URI as string, opts)
        .then((mongoose) => {
          console.log('MongoDB connected successfully');
          mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
          });
          mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            cached.conn = null;
            cached.promise = null;
          });
          mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
          });
          return mongoose;
        })
        .catch((err) => {
          console.error('MongoDB connection error:', err);
          cached.promise = null;
          throw err;
        });
    } catch (error) {
      console.error('Error during MongoDB connection setup:', error);
      cached.promise = null;
      throw error;
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
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

export default dbConnect; 