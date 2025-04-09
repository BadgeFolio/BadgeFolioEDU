import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User, Badge, Submission, EarnedBadge, Classroom } from '@/lib/models';
import { isSuperAdmin } from '@/lib/email';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();

    // Find user by ID
    const user = await User.findById(params.userId).select('name email image role');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return public user data
    return NextResponse.json({
      id: user._id,
      name: user.name,
      image: user.image,
      role: user.role
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is an admin or super admin
    const currentUserEmail = session.user.email;
    const currentUserRole = (session.user as any)?.role;
    const isAdmin = currentUserRole === 'admin';
    const userIsSuperAdmin = isSuperAdmin(currentUserEmail);

    if (!isAdmin && !userIsSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Get the user to be deleted
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting your own account
    if (userToDelete.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Prevent non-super admins from deleting admins
    if (userToDelete.role === 'admin' && !userIsSuperAdmin) {
      return NextResponse.json({ error: 'Only super admins can delete admin accounts' }, { status: 403 });
    }

    // Super admin account can never be deleted (extra protection)
    if (isSuperAdmin(userToDelete.email)) {
      return NextResponse.json({ error: 'The super admin account cannot be deleted' }, { status: 403 });
    }

    // Begin a cleanup process for the user
    console.log(`Starting deletion of user ${userToDelete.name} (${userToDelete.email})`);

    // 1. Delete user's submissions
    const deleteSubmissions = await Submission.deleteMany({ studentId: userId });
    console.log(`Deleted ${deleteSubmissions.deletedCount} submissions`);

    // 2. Delete user's earned badges
    const deleteEarnedBadges = await EarnedBadge.deleteMany({ student: userId });
    console.log(`Deleted ${deleteEarnedBadges.deletedCount} earned badges`);

    // 3. Remove user from classrooms
    const updateClassrooms = await Classroom.updateMany(
      { students: userId },
      { $pull: { students: userId } }
    );
    console.log(`Updated ${updateClassrooms.modifiedCount} classrooms`);

    // 4. If teacher, delete their created badges
    if (userToDelete.role === 'teacher' || userToDelete.role === 'admin') {
      // We're not deleting badges, just updating creatorId to super admin
      const superAdminId = await User.findOne({ 
        email: { $regex: new RegExp('^emailmrdavola@gmail.com$', 'i') } 
      }).select('_id');
      
      if (superAdminId) {
        const updateBadges = await Badge.updateMany(
          { creatorId: userId },
          { $set: { creatorId: superAdminId._id } }
        );
        console.log(`Updated ${updateBadges.modifiedCount} badges to new creator`);
      } else {
        console.log('Super admin not found, badges will be orphaned');
      }
    }

    // 5. Finally delete the user
    const deleteResult = await User.findByIdAndDelete(userId);

    if (!deleteResult) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'User deleted successfully',
      user: {
        id: deleteResult._id,
        name: deleteResult.name,
        email: deleteResult.email,
        role: deleteResult.role
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 