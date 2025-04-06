import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { writeFile } from 'fs/promises';
import path from 'path';

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    
    // Check if user is authenticated and is an admin
    if (!session?.user || 
        (session.user.email !== SUPER_ADMIN_EMAIL && 
         (session.user as any).role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { adminCode, teacherCode } = await request.json();

    if (!adminCode || !teacherCode) {
      return NextResponse.json(
        { error: 'Both admin and teacher codes are required' },
        { status: 400 }
      );
    }

    // Read current .env.local content
    const envPath = path.join(process.cwd(), '.env.local');
    const currentEnv = await import('fs').then(fs => 
      fs.readFileSync(envPath, 'utf8')
    );

    // Update the invite codes while preserving other environment variables
    const updatedEnv = currentEnv
      .split('\n')
      .map(line => {
        if (line.startsWith('ADMIN_INVITE_CODE=')) {
          return `ADMIN_INVITE_CODE=${adminCode}`;
        }
        if (line.startsWith('TEACHER_INVITE_CODE=')) {
          return `TEACHER_INVITE_CODE=${teacherCode}`;
        }
        return line;
      })
      .join('\n');

    // Write back to .env.local
    await writeFile(envPath, updatedEnv);

    return NextResponse.json({ 
      message: 'Invite codes updated successfully',
      adminCode,
      teacherCode
    });
  } catch (error) {
    console.error('Error updating invite codes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update invite codes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    
    // Check if user is authenticated and is an admin
    if (!session?.user || 
        (session.user.email !== SUPER_ADMIN_EMAIL && 
         (session.user as any).role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      adminCode: process.env.ADMIN_INVITE_CODE,
      teacherCode: process.env.TEACHER_INVITE_CODE
    });
  } catch (error) {
    console.error('Error fetching invite codes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invite codes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 