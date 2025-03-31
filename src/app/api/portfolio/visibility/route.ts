import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { badgeId, isVisible, showEvidence } = await request.json();
    if (typeof badgeId !== 'string' || (isVisible === undefined && showEvidence === undefined)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const updateFields: Record<string, boolean> = {};
    if (isVisible !== undefined) {
      updateFields.isVisible = isVisible;
    }
    if (showEvidence !== undefined) {
      updateFields.showEvidence = showEvidence;
    }

    const db = await connectToDatabase();
    const submission = await db.collection('submissions').findOneAndUpdate(
      {
        _id: new ObjectId(badgeId),
        studentId: new ObjectId(session.user._id),
        status: 'approved'
      },
      {
        $set: updateFields
      },
      { returnDocument: 'after' }
    );

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Visibility settings updated successfully', 
      submission 
    });
  } catch (error) {
    console.error('Error updating badge visibility:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 