import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User, Submission, EarnedBadge } from '@/lib/models';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get the teacher's ID and verify role
    const teacher = await User.findOne({ email: session.user.email });
    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Only teachers can update submissions' },
        { status: 403 }
      );
    }

    const { status, comment } = await request.json();
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    if (status === 'rejected' && !comment?.trim()) {
      return NextResponse.json(
        { error: 'Comment is required for rejection' },
        { status: 400 }
      );
    }

    // Find and populate the submission
    const submission = await Submission.findById(params.id)
      .populate('badgeId')
      .populate('studentId');

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Verify that this teacher is the one who should review this submission
    if (submission.teacherId.toString() !== teacher._id.toString()) {
      return NextResponse.json(
        { error: 'You can only review submissions assigned to you' },
        { status: 403 }
      );
    }

    // Update submission status
    submission.status = status;
    if (comment) {
      submission.comments.push({
        content: comment.trim(),
        userId: teacher._id,
        createdAt: new Date()
      });
    }

    // If the submission is approved, create an earned badge entry
    if (status === 'approved') {
      try {
        // Check if the student already has this badge
        const existingEarnedBadge = await EarnedBadge.findOne({
          badge: submission.badgeId._id,
          student: submission.studentId._id
        });

        if (!existingEarnedBadge) {
          // Create the earned badge entry
          const earnedBadge = await EarnedBadge.create({
            badge: submission.badgeId._id,
            student: submission.studentId._id,
            reactions: [],
            createdAt: new Date()
          });

          // Verify the earned badge was created with proper references
          const verifiedEarnedBadge = await EarnedBadge.findById(earnedBadge._id)
            .populate('badge')
            .populate('student');

          if (!verifiedEarnedBadge?.badge || !verifiedEarnedBadge?.student) {
            throw new Error('Failed to create earned badge with proper references');
          }

          // Update the student's earned badges
          const student = await User.findById(submission.studentId._id);
          if (student) {
            if (!student.earnedBadges) {
              student.earnedBadges = [];
            }
            if (!student.earnedBadges.includes(submission.badgeId._id)) {
              student.earnedBadges.push(submission.badgeId._id);
              await student.save();
            }
          }
        }
      } catch (error) {
        console.error('Error creating earned badge:', error);
        return NextResponse.json(
          { error: 'Failed to create earned badge' },
          { status: 500 }
        );
      }
    }

    await submission.save();

    return NextResponse.json({
      success: true,
      message: `Submission ${status}`,
      submission
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 