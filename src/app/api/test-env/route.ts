import { NextRequest, NextResponse } from 'next/server';
import { isBuildPhase } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Only allow in development or with special header
  if (process.env.NODE_ENV !== 'development' && 
      request.headers.get('x-env-check-token') !== process.env.ENV_CHECK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Collect environment info
  const envInfo = {
    buildPhase: isBuildPhase,
    nodeEnv: process.env.NODE_ENV,
    nextPhase: process.env.NEXT_PHASE,
    vercelEnv: process.env.VERCEL_ENV,
    vercelBuildStep: process.env.VERCEL_BUILD_STEP,
    mongodbUriDefined: !!process.env.MONGODB_URI,
    nextAuthSecretDefined: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrlDefined: !!process.env.NEXTAUTH_URL,
    timestamp: new Date().toISOString(),
  };
  
  return NextResponse.json(envInfo);
} 