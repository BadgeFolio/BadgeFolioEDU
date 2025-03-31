import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Submission, User } from '@/lib/models';

export async function POST(request: Request) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Verify the user is a teacher
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can clean up submissions' }, { status: 403 });
    }

    // Find submissions with problematic evidence format
    const oldSubmissions = await Submission.find({
      $or: [
        { evidence: { $type: 'object' } },
        { evidence: { $exists: false } },
        { evidence: null },
        { evidence: "" }
      ]
    });

    console.log(`Found ${oldSubmissions.length} submissions with old/invalid evidence format`);
    
    if (oldSubmissions.length === 0) {
      return NextResponse.json({ message: 'No old submissions found to clean up' });
    }

    // Delete the old submissions
    const result = await Submission.deleteMany({
      _id: { $in: oldSubmissions.map(s => s._id) }
    });

    return NextResponse.json({
      message: `Successfully cleaned up ${result.deletedCount} old submissions`,
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 