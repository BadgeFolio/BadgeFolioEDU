export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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