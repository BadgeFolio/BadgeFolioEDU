import { NextRequest, NextResponse } from 'next/server';
import { isBuildPhase, env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // In production, still require token for security but make message more helpful
  if (process.env.NODE_ENV === 'production' && 
      request.headers.get('x-env-check-token') !== process.env.ENV_CHECK_TOKEN) {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      hint: 'Add header x-env-check-token with your ENV_CHECK_TOKEN value' 
    }, { status: 401 });
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
    adminInviteCodeDefined: !!process.env.ADMIN_INVITE_CODE,
    teacherInviteCodeDefined: !!process.env.TEACHER_INVITE_CODE,
    cloudinaryConfigDefined: !!(process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET),
    timestamp: new Date().toISOString(),
  };
  
  return NextResponse.json(envInfo);
} 