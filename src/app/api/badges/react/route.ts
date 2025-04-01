import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Badge } from '@/lib/models';
import mongoose from 'mongoose';

interface Reaction {
  type: '👏' | '🎉' | '🌟' | '🏆' | '💪';
  users: string[];
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { badgeId, type } = await request.json();
    
    if (!badgeId || !type) {
      return NextResponse.json({ error: 'Badge ID and reaction type are required' }, { status: 400 });
    }

    if (!['👏', '🎉', '🌟', '🏆', '💪'].includes(type)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }

    // Find the badge
    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Initialize reactions array if it doesn't exist
    if (!badge.reactions) {
      badge.reactions = [] as any;
    }

    // Handle the reaction (add or remove)
    const reactionIndex = badge.reactions.findIndex((r: any) => r.type === type);
    
    if (reactionIndex > -1) {
      // Check if user has already reacted
      const userIndex = badge.reactions[reactionIndex].users.indexOf(session.user.email);
      
      if (userIndex > -1) {
        // Remove user's reaction
        badge.reactions[reactionIndex].users.splice(userIndex, 1);
      } else {
        // Add user's reaction
        badge.reactions[reactionIndex].users.push(session.user.email);
      }
    } else {
      // Add new reaction type with user
      badge.reactions.push({
        type,
        users: [session.user.email]
      });
    }

    // Remove reactions with no users
    badge.reactions = badge.reactions.filter((r: any) => r.users.length > 0) as any;

    // Save the updated badge
    await badge.save();

    return NextResponse.json({
      success: true,
      reactions: badge.reactions
    });
  } catch (error) {
    console.error('Error updating badge reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
} 