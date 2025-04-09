import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Badge, Submission, User } from '@/lib/models';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface EvidenceFile {
  url: string;
  type: 'image' | 'document' | 'drawing';
  name: string;
  mimeType: string;
}

interface EvidenceLink {
  url: string;
  title: string;
  description?: string;
}

interface SavedSubmission {
  _id: string;
  badgeId: any;
  studentId: any;
  teacherId: any;
  status: string;
  evidence: string;
  isVisible: boolean;
  comments: Array<{
    content: string;
    userId: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  content: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

interface TransformedSubmission {
  _id: mongoose.Types.ObjectId;
  badgeId: {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    image?: string;
    category: {
      name: string;
      color: string;
    };
  };
  studentId: {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  };
  teacherId: {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  };
  status: string;
  evidence: string;
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
  isVisible: boolean;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get the student's ID
    const student = await User.findOne({ email: session.user.email });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const data = await request.json();
    const { badgeId, evidence, showEvidence = false } = data;

    console.log('Received submission data:', JSON.stringify(data, null, 2));

    // Validate evidence
    if (!evidence || typeof evidence !== 'string' || !evidence.trim()) {
      return NextResponse.json({ error: 'Evidence is required' }, { status: 400 });
    }

    // Validate badge exists
    const badge = await Badge.findById(badgeId).populate('creatorId');
    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    // Check if student already has a pending submission for this badge
    const existingSubmission = await Submission.findOne({
      badgeId,
      studentId: student._id,
      status: 'pending',
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You already have a pending submission for this badge' },
        { status: 400 }
      );
    }

    // Create submission with evidence as plain text
    const submissionData = {
      badgeId,
      studentId: student._id,
      teacherId: badge.creatorId._id,
      evidence: evidence.trim(),
      status: 'pending',
      isVisible: true,
      showEvidence: showEvidence,
      comments: []
    };

    console.log('Creating submission with data:', JSON.stringify(submissionData, null, 2));

    // Create the submission
    const submission = await Submission.create(submissionData);

    // Verify the evidence was saved correctly and get the populated submission
    const savedSubmission = await Submission.findById(submission._id)
      .populate({
        path: 'badgeId',
        select: '_id name description image category',
        populate: {
          path: 'category',
          select: 'name color'
        }
      })
      .populate('studentId', '_id name email')
      .populate('teacherId', '_id name email')
      .lean();

    if (!savedSubmission) {
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    }

    console.log('Saved submission:', JSON.stringify(savedSubmission, null, 2));

    // Return the submission directly without any transformation
    return NextResponse.json(savedSubmission);
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    // Get the current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build the query
    const query: any = {};
    
    if (currentUser.role === 'teacher') {
      query.teacherId = currentUser._id;
    } else {
      query.studentId = userId ? new mongoose.Types.ObjectId(userId) : currentUser._id;
    }
    
    if (status) {
      query.status = status;
    }

    console.log('Fetching submissions with query:', query);

    // Fetch submissions with related data
    const submissions = await Submission.find(query)
      .populate({
        path: 'badgeId',
        select: '_id name description image category',
        populate: {
          path: 'category',
          select: 'name color'
        }
      })
      .populate('studentId', '_id name email')
      .populate('teacherId', '_id name email')
      .lean();

    console.log('Raw submissions from database:', JSON.stringify(submissions, null, 2));

    // Return submissions directly without transformation
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 