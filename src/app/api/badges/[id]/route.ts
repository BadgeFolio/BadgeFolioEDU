import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Badge, User } from '@/lib/models';
import mongoose from 'mongoose';

interface BadgeDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  criteria: string;
  difficulty: number;
  isPublic: boolean;
  image?: string;
  category: string;
  creatorId: {
    _id: mongoose.Types.ObjectId;
    email: string;
    name?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ error: 'Badge ID is required' }, { status: 400 });
    }

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid badge ID format' }, { status: 400 });
    }

    await dbConnect();

    const badge = await Badge.findById(params.id)
      .populate('creatorId', 'email name')
      .lean() as unknown as BadgeDocument;

    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Fetch category information if it exists
    let categoryInfo = null;
    if (badge.category) {
      try {
        const { Category } = await import('@/lib/models');
        categoryInfo = await Category.findOne({ name: badge.category }).lean();
      } catch (err) {
        console.error('Error fetching category:', err);
      }
    }

    // Convert _id to id and ensure all ObjectIds are converted to strings
    const formattedBadge = {
      ...badge,
      id: badge._id.toString(),
      _id: badge._id.toString(), // Keep _id for backward compatibility
      creatorId: {
        ...badge.creatorId,
        id: badge.creatorId._id.toString(),
        _id: badge.creatorId._id.toString()
      },
      // Add category information if available
      category: categoryInfo ? {
        ...categoryInfo,
        _id: (categoryInfo as any)._id?.toString()
      } : badge.category
    };

    return NextResponse.json(formattedBadge);
  } catch (error) {
    console.error('Error fetching badge:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid badge ID format' }, { status: 400 });
    }

    const user = await User.findOne({ email: session.user?.email });
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only teachers and administrators can update badges' },
        { status: 403 }
      );
    }

    await dbConnect();
    const badge = await Badge.findById(params.id);

    if (!badge) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404 }
      );
    }

    // Allow admins to update any badge, teachers can only update their own
    if (user.role !== 'admin' && badge.creatorId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'You can only update your own badges' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const updatedBadge = await Badge.findByIdAndUpdate(
      params.id,
      {
        name: data.name,
        description: data.description,
        criteria: data.criteria,
        difficulty: data.difficulty,
        isPublic: data.isPublic,
        category: data.category,
      },
      { new: true }
    ).populate('creatorId', 'email name')
    .lean() as unknown as BadgeDocument;

    // Format the response to include string IDs
    const formattedBadge = {
      ...updatedBadge,
      id: updatedBadge._id.toString(),
      _id: updatedBadge._id.toString(),
      creatorId: {
        ...updatedBadge.creatorId,
        id: updatedBadge.creatorId._id.toString(),
        _id: updatedBadge.creatorId._id.toString()
      }
    };

    return NextResponse.json(formattedBadge);
  } catch (error) {
    console.error('Error updating badge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid badge ID format' }, { status: 400 });
    }

    const user = await User.findOne({ email: session.user?.email });
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only teachers and administrators can delete badges' },
        { status: 403 }
      );
    }

    await dbConnect();
    const badge = await Badge.findById(params.id);

    if (!badge) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404 }
      );
    }

    // Allow admins to delete any badge, teachers can only delete their own
    if (user.role !== 'admin' && badge.creatorId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'You can only delete your own badges' },
        { status: 403 }
      );
    }

    await Badge.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Badge deleted successfully' });
  } catch (error) {
    console.error('Error deleting badge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 