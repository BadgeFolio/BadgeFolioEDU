import { MongoClient, ObjectId } from 'mongodb';
import { isBuildPhase, env } from '@/lib/env';

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Skip actual connection during build
if (isBuildPhase) {
  // @ts-ignore - Provide a dummy client for build
  client = {};
  // @ts-ignore - Provide a dummy promise for build
  clientPromise = Promise.resolve({});
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(env.MONGODB_URI, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(env.MONGODB_URI, options);
  clientPromise = client.connect();
}

export async function connectToDatabase() {
  // For build/static generation, return a mock DB with all commonly used methods
  if (isBuildPhase) {
    console.warn('Build phase detected in db.ts - Using mock database');
    // Create a comprehensive mock implementation for all MongoDB methods
    const mockCollection = {
      find: () => ({ 
        toArray: () => Promise.resolve([]),
        sort: () => ({ 
          limit: () => ({ toArray: () => Promise.resolve([]) }),
          skip: () => ({ 
            limit: () => ({ toArray: () => Promise.resolve([]) }) 
          }),
          toArray: () => Promise.resolve([])
        })
      }),
      findOne: () => Promise.resolve(null),
      findOneAndUpdate: () => Promise.resolve(null),
      findOneAndDelete: () => Promise.resolve(null),
      updateOne: () => Promise.resolve({ modifiedCount: 0, matchedCount: 0 }),
      updateMany: () => Promise.resolve({ modifiedCount: 0, matchedCount: 0 }),
      deleteOne: () => Promise.resolve({ deletedCount: 0 }),
      deleteMany: () => Promise.resolve({ deletedCount: 0 }),
      insertOne: () => Promise.resolve({ insertedId: new ObjectId() }),
      insertMany: () => Promise.resolve({ insertedIds: [], insertedCount: 0 }),
      count: () => Promise.resolve(0),
      countDocuments: () => Promise.resolve(0),
      aggregate: () => ({
        toArray: () => Promise.resolve([])
      }),
      distinct: () => Promise.resolve([]),
    };

    return {
      collection: () => mockCollection
    };
  }

  const client = await clientPromise;
  const db = client.db();
  return db;
} 