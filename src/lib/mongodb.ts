import { MongoClient } from 'mongodb';

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
  // @ts-ignore - Provide a dummy client for build
  client = {} as MongoClient;
  // @ts-ignore - Provide a dummy promise for build
  clientPromise = Promise.resolve({} as MongoClient);
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