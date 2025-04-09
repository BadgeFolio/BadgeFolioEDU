import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Submission, User, Badge } from '@/lib/models';
import mongoose from 'mongoose';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Define a simple type for the submission document
type SubmissionDoc = {
  _id: mongoose.Types.ObjectId;
  badgeId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: string;
  comments: Array<{
    content: string;
    userId: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;
  save(): Promise<any>;
};

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

    // Only teachers and admins can update submissions
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only teachers and administrators can update submissions' }, { status: 403 });
    }

    const data = await request.json();
    const { submissionIds, status, comment } = data;

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json({ error: 'No submission IDs provided' }, { status: 400 });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // If rejecting, require a comment
    if (status === 'rejected' && (!comment || typeof comment !== 'string' || !comment.trim())) {
      return NextResponse.json({ error: 'A comment is required when rejecting submissions' }, { status: 400 });
    }

    // Query to find teacher's submissions
    const query: any = {
      _id: { $in: submissionIds.map(id => new mongoose.Types.ObjectId(id)) }
    };

    // Check if teacher can update these submissions
    // For admins, allow updating any submissions
    if (user.role === 'teacher') {
      query.teacherId = user._id;
    }

    // Find all the submissions to update
    const submissions = await Submission.find(query);
    
    if (submissions.length === 0) {
      return NextResponse.json({ error: 'No valid submissions found' }, { status: 404 });
    }

    // Update each submission
    const updatePromises = submissions.map(async (submission: SubmissionDoc) => {
      submission.status = status;
      
      // Add comment if provided
      if (comment && comment.trim()) {
        submission.comments.push({
          content: comment.trim(),
          userId: user._id,
          createdAt: new Date()
        });
      }

      // If approving, add the badge to the student's earned badges
      if (status === 'approved') {
        const student = await User.findById(submission.studentId);
        if (student && !student.earnedBadges.includes(submission.badgeId)) {
          await User.updateOne(
            { _id: submission.studentId },
            { $addToSet: { earnedBadges: submission.badgeId }}
          );
        }
      }
      
      return submission.save();
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      message: `Successfully ${status} ${submissions.length} submissions`,
      updatedCount: submissions.length
    });
  } catch (error) {
    console.error('Error updating submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 