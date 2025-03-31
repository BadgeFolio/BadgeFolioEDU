import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Badge, User } from '@/lib/models';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Check if user is admin
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can perform bulk deletion' }, { status: 403 });
    }

    // Get badge IDs from request body
    const { badgeIds } = await request.json();
    if (!Array.isArray(badgeIds) || badgeIds.length === 0) {
      return NextResponse.json({ error: 'Invalid badge IDs' }, { status: 400 });
    }

    // Delete badges
    const result = await Badge.deleteMany({ _id: { $in: badgeIds } });

    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} badges`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting badges:', error);
    return NextResponse.json(
      { error: 'Failed to delete badges', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 