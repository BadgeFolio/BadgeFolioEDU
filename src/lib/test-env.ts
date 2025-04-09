/**
 * Environment variables test utility
 * 
 * Use this script to check which environment variables are defined
 * Run with: ts-node src/lib/test-env.ts
 */

// Import dotenv to load environment variables
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

const ENV_VARS_TO_CHECK = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_BUILD_STEP',
  'NODE_ENV',
  'NEXT_PHASE',
  'ADMIN_INVITE_CODE',
  'TEACHER_INVITE_CODE',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

function testEnvVars() {
  console.log('Environment Variables Test');
  console.log('=========================');
  console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);
  console.log('\nVariables status:');
  
  ENV_VARS_TO_CHECK.forEach(varName => {
    const value = process.env[varName];
    let displayValue = value;
    
    // Mask sensitive values
    if (varName.includes('SECRET') || varName.includes('URI') || varName.includes('KEY')) {
      displayValue = value ? `${value.substring(0, 8)}...` : 'undefined';
    }
    
    console.log(`- ${varName}: ${value ? '✓' : '✗'} ${displayValue || ''}`);
  });
  
  console.log('\nVercel-specific variables:');
  Object.keys(process.env)
    .filter(key => key.startsWith('VERCEL_'))
    .forEach(key => {
      console.log(`- ${key}: ${process.env[key]}`);
    });
}

// Run if executed directly
if (require.main === module) {
  testEnvVars();
}

export default testEnvVars; 