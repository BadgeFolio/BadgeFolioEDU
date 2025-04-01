import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { EarnedBadge } from '@/lib/models';

interface Reaction {
  type: '👏' | '🎉' | '🌟' | '🏆' | '💪';
  users: string[];
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await request.json();
    if (!type || !['👏', '🎉', '🌟', '🏆', '💪'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    await dbConnect();

    const earnedBadge = await EarnedBadge.findById(params.id);
    if (!earnedBadge) {
      return NextResponse.json(
        { error: 'Earned badge not found' },
        { status: 404 }
      );
    }

    // Find existing reaction of this type
    const existingReaction = earnedBadge.reactions.find((r: Reaction) => r.type === type);
    
    if (existingReaction) {
      // Toggle user's reaction
      if (existingReaction.users.includes(session.user.email)) {
        // Remove user's reaction
        existingReaction.users = existingReaction.users.filter(
          (email: string) => email !== session.user.email
        );
      } else {
        // Add user's reaction
        existingReaction.users.push(session.user.email);
      }
    } else {
      // Add new reaction type with user
      earnedBadge.reactions.push({
        type,
        users: [session.user.email]
      });
    }

    // Remove reaction types with no users
    earnedBadge.reactions = earnedBadge.reactions.filter(
      (r: Reaction) => r.users.length > 0
    );

    await earnedBadge.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 