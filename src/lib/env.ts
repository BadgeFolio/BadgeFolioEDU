/**
 * Helper functions and constants for environment variable handling
 */

// Ensure environment variables are loaded
import * as dotenv from 'dotenv';

// In local development, load from .env.local
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

/**
 * Detects if we're in build/static generation phase
 * Used to conditionally skip DB connections and provide mock values
 */
export const isBuildPhase = 
  process.env.NEXT_PHASE === 'phase-production-build' || 
  process.env.VERCEL_ENV === 'production' && process.env.VERCEL_BUILD_STEP === 'build';

/**
 * Get an environment variable with a fallback for build phase
 * @param key The environment variable key
 * @param defaultValue Fallback value to use during build
 * @returns The environment variable value or fallback
 */
export function getEnvVariable(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  
  if (!value) {
    // During build phase, provide fallbacks for certain variables
    if (key === 'MONGODB_URI' && process.env.NODE_ENV !== 'production') {
      return 'mongodb://localhost:27017/badgefolio';
    }
    
    if (key === 'NEXTAUTH_SECRET' && process.env.NODE_ENV !== 'production') {
      return 'build-phase-secret';
    }
    
    console.error(`Environment variable ${key} is missing`);
    throw new Error(`Please provide process.env.${key}`);
  }
  
  return value;
}

/**
 * Get essential environment variables with build fallbacks
 */
export const env = {
  MONGODB_URI: getEnvVariable('MONGODB_URI'),
  NEXTAUTH_SECRET: getEnvVariable('NEXTAUTH_SECRET'),
  NEXTAUTH_URL: getEnvVariable('NEXTAUTH_URL', 'http://localhost:3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  ADMIN_INVITE_CODE: process.env.ADMIN_INVITE_CODE || 'admin-code',
  TEACHER_INVITE_CODE: process.env.TEACHER_INVITE_CODE || 'teacher-code',
}; 