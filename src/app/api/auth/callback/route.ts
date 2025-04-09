export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';

// Skip actual DB connection during build
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // During build phase, return mock data
    if (isBuildPhase) {
      console.log('Build phase detected, skipping DB connection');
      return NextResponse.json({ 
        email, 
        name: 'Build User',
        role: 'student' 
      });
    }

    // Connect to MongoDB
    await dbConnect();

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with student role
      user = await User.create({
        email,
        name: email.split('@')[0], // Simple name from email
        role: 'student',
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 