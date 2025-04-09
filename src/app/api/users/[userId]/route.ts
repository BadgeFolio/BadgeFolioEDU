import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();

    // Find user by ID
    const user = await User.findById(params.userId).select('name email image role');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return public user data
    return NextResponse.json({
      id: user._id,
      name: user.name,
      image: user.image,
      role: user.role
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 