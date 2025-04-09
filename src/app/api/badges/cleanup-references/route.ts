import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Badge, Submission, EarnedBadge, User } from '@/lib/models';
import mongoose from 'mongoose';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Verify user is admin
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can clean up badge references' }, { status: 403 });
    }

    // Get all badge IDs
    const badges = await Badge.find({}, '_id');
    const validBadgeIds = badges.map((badge: any) => badge._id.toString());

    console.log(`Found ${validBadgeIds.length} valid badges`);

    // Remove submissions with invalid badge references
    const submissionsResult = await Submission.deleteMany({
      badgeId: { $nin: validBadgeIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
    });

    console.log(`Removed ${submissionsResult.deletedCount} submissions with invalid badge references`);

    // Remove earned badges with invalid badge references
    const portfolioResult = await EarnedBadge.deleteMany({
      badge: { $nin: validBadgeIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
    });

    console.log(`Removed ${portfolioResult.deletedCount} portfolio references with invalid badge references`);

    return NextResponse.json({
      message: 'Badge references cleaned up successfully',
      submissionsRemoved: submissionsResult.deletedCount,
      portfolioReferencesRemoved: portfolioResult.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up badge references:', error);
    return NextResponse.json(
      { error: 'Failed to clean up badge references', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 