import { MongoClient, ObjectId } from 'mongodb';

// Check if we're in the build/static generation phase
const isBuildPhase = process.env.NODE_ENV === 'production' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'production');

// Only throw in development, not in production build
if (!process.env.MONGODB_URI && !isBuildPhase) {
  if (process.env.NODE_ENV === 'development') {
    throw new Error('Please add your Mongo URI to .env.local');
  } else {
    console.warn('MongoDB URI is missing in production environment');
  }
}

const uri = process.env.MONGODB_URI || 'mongodb://placeholder-for-build:27017/placeholder-db';
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Skip actual connection during build
if (isBuildPhase) {
  console.warn('Build phase detected in mongodb.ts - Using mock client');
  
  // Create a comprehensive mock collection
  const mockCollection = {
    find: () => ({ 
      toArray: () => Promise.resolve([]),
      sort: () => ({ 
        limit: () => ({ toArray: () => Promise.resolve([]) }),
        skip: () => ({ limit: () => ({ toArray: () => Promise.resolve([]) }) }),
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
  
  // Mock db function that returns our mockCollection for any collection name
  const mockDb = {
    collection: () => mockCollection,
    // Add other db methods as needed
    command: () => Promise.resolve({}),
    admin: () => ({
      listDatabases: () => Promise.resolve({ databases: [] }),
      serverStatus: () => Promise.resolve({})
    }),
  };
  
  // Create a mock client with a db method that returns our mockDb
  const mockClient = {
    db: () => mockDb,
    // Add other client methods as needed
    connect: () => Promise.resolve(mockClient),
    close: () => Promise.resolve(),
    isConnected: () => true,
  } as unknown as MongoClient;
  
  // @ts-ignore - Provide a dummy client for build
  client = mockClient;
  // @ts-ignore - Provide a dummy promise for build
  clientPromise = Promise.resolve(mockClient);
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise; 