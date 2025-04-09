import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { EarnedBadge } from '@/lib/models';

interface Reaction {
  type: '👏' | '🎉' | '🌟' | '🏆' | '💪';
  users: string[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch earned badges with populated badge and student data
    const earnedBadges = await EarnedBadge.find({})
      .populate({
        path: 'badge',
        select: 'name description image difficulty',
        model: 'Badge'
      })
      .populate({
        path: 'student',
        select: 'name email image',
        model: 'User'
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Filter out any earned badges with missing badge or student data
    const validEarnedBadges = earnedBadges.filter(
      (badge: any) => badge.badge && badge.student && badge.badge.name && badge.student.name
    );

    if (validEarnedBadges.length === 0) {
      console.log('No valid earned badges found. Raw data:', JSON.stringify(earnedBadges, null, 2));
    }

    return NextResponse.json(validEarnedBadges);
  } catch (error) {
    console.error('Error fetching community data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { badgeId, type } = await request.json();
    
    const earnedBadge = await EarnedBadge.findById(badgeId)
      .populate({
        path: 'badge',
        select: 'name description image difficulty',
        model: 'Badge'
      })
      .populate({
        path: 'student',
        select: 'name email image',
        model: 'User'
      });

    if (!earnedBadge) {
      return NextResponse.json({ error: 'Earned badge not found' }, { status: 404 });
    }

    // Add or remove reaction
    const reactionIndex = earnedBadge.reactions.findIndex((r: Reaction) => r.type === type);
    if (reactionIndex > -1) {
      const userIndex = earnedBadge.reactions[reactionIndex].users.indexOf(session.user.email);
      if (userIndex > -1) {
        earnedBadge.reactions[reactionIndex].users.splice(userIndex, 1);
      } else {
        earnedBadge.reactions[reactionIndex].users.push(session.user.email);
      }
    } else {
      earnedBadge.reactions.push({
        type,
        users: [session.user.email]
      });
    }

    // Remove reactions with no users
    earnedBadge.reactions = earnedBadge.reactions.filter((r: Reaction) => r.users.length > 0);

    await earnedBadge.save();

    // Re-fetch the earned badge to ensure we have all populated data
    const updatedEarnedBadge = await EarnedBadge.findById(earnedBadge._id)
      .populate({
        path: 'badge',
        select: 'name description image difficulty',
        model: 'Badge'
      })
      .populate({
        path: 'student',
        select: 'name email image',
        model: 'User'
      });

    return NextResponse.json(updatedEarnedBadge);
  } catch (error) {
    console.error('Error updating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
} 