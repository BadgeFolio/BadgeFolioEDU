import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User, Badge } from '@/lib/models';
import mongoose from 'mongoose';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get the current user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only teachers and admins can approve badges
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only teachers and administrators can approve badges' }, { status: 403 });
    }

    const data = await request.json();
    const { badgeId, status, comment } = data;

    if (!badgeId || !mongoose.Types.ObjectId.isValid(badgeId)) {
      return NextResponse.json({ error: 'Invalid badge ID' }, { status: 400 });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // If rejecting, require a comment
    if (status === 'rejected' && (!comment || !comment.trim())) {
      return NextResponse.json({ error: 'Comment is required when rejecting a badge' }, { status: 400 });
    }

    // Find the badge to update
    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Update badge approval status
    badge.approvalStatus = status;
    badge.approvedBy = user._id;
    badge.approvalDate = new Date();
    
    if (comment) {
      badge.approvalComment = comment.trim();
    }

    await badge.save();

    // Return updated badge with approver info
    const updatedBadge = await Badge.findById(badgeId)
      .populate('creatorId', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return NextResponse.json({
      message: `Badge ${status} successfully`,
      badge: {
        ...updatedBadge,
        _id: updatedBadge._id.toString(),
        creatorId: {
          ...updatedBadge.creatorId,
          _id: updatedBadge.creatorId._id.toString()
        },
        approvedBy: updatedBadge.approvedBy ? {
          ...updatedBadge.approvedBy,
          _id: updatedBadge.approvedBy._id.toString()
        } : undefined
      }
    });
  } catch (error) {
    console.error('Error approving badge:', error);
    return NextResponse.json({ 
      error: 'Failed to approve badge',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Bulk approve multiple badges
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get the current user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only teachers and admins can approve badges
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only teachers and administrators can approve badges' }, { status: 403 });
    }

    const data = await request.json();
    const { badgeIds, status, comment } = data;

    if (!badgeIds || !Array.isArray(badgeIds) || badgeIds.length === 0) {
      return NextResponse.json({ error: 'No badge IDs provided' }, { status: 400 });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // If rejecting, require a comment
    if (status === 'rejected' && (!comment || !comment.trim())) {
      return NextResponse.json({ error: 'Comment is required when rejecting badges' }, { status: 400 });
    }

    // Validate badge IDs
    const validBadgeIds = badgeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validBadgeIds.length === 0) {
      return NextResponse.json({ error: 'No valid badge IDs provided' }, { status: 400 });
    }

    // Update badges in bulk
    const result = await Badge.updateMany(
      { _id: { $in: validBadgeIds } },
      { 
        $set: { 
          approvalStatus: status,
          approvedBy: user._id,
          approvalDate: new Date(),
          approvalComment: comment ? comment.trim() : undefined
        } 
      }
    );

    return NextResponse.json({
      message: `${result.modifiedCount} badges ${status} successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk approving badges:', error);
    return NextResponse.json({ 
      error: 'Failed to approve badges',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 