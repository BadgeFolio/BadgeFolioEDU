/**
 * Environment variables test utility
 * 
 * Use this script to check which environment variables are defined
 * Run with: ts-node src/lib/test-env.ts
 */

const ENV_VARS_TO_CHECK = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_BUILD_STEP',
  'NODE_ENV',
  'NEXT_PHASE'
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
    if (varName.includes('SECRET') || varName.includes('URI')) {
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