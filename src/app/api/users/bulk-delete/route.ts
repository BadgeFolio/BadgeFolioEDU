export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User, Badge, Submission, EarnedBadge, Classroom } from '@/lib/models';
import { isSuperAdmin } from '@/lib/email';

export async function POST(request: Request) {
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

    // Get the list of user IDs to delete
    const { userIds } = await request.json();
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });
    }

    await dbConnect();

    // Get all users to be deleted
    const usersToDelete = await User.find({ _id: { $in: userIds } });
    
    if (usersToDelete.length === 0) {
      return NextResponse.json({ error: 'No matching users found' }, { status: 404 });
    }

    // Check for protected users (self, super admin, admins if not super admin)
    const protectedUsers = [];
    const deletableUsers = [];

    for (const user of usersToDelete) {
      // Check if trying to delete yourself
      if (user.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        protectedUsers.push({ id: user._id, name: user.name, reason: 'Cannot delete your own account' });
        continue;
      }

      // Check if trying to delete super admin
      if (isSuperAdmin(user.email)) {
        protectedUsers.push({ id: user._id, name: user.name, reason: 'Cannot delete super admin account' });
        continue;
      }

      // Check if regular admin trying to delete another admin
      if (user.role === 'admin' && !userIsSuperAdmin) {
        protectedUsers.push({ id: user._id, name: user.name, reason: 'Only super admin can delete admin accounts' });
        continue;
      }

      // User can be deleted
      deletableUsers.push(user);
    }

    // Get the super admin ID for reassigning content
    const superAdminId = await User.findOne({ 
      email: { $regex: new RegExp('^emailmrdavola@gmail.com$', 'i') } 
    }).select('_id');

    // Process each deletable user
    const deletionResults = [];
    let totalSubmissionsDeleted = 0;
    let totalEarnedBadgesDeleted = 0;
    let totalClassroomsUpdated = 0;
    let totalBadgesReassigned = 0;

    for (const user of deletableUsers) {
      const userId = user._id;

      try {
        // 1. Delete user's submissions
        const deleteSubmissions = await Submission.deleteMany({ studentId: userId });
        totalSubmissionsDeleted += deleteSubmissions.deletedCount;

        // 2. Delete user's earned badges
        const deleteEarnedBadges = await EarnedBadge.deleteMany({ student: userId });
        totalEarnedBadgesDeleted += deleteEarnedBadges.deletedCount;

        // 3. Remove user from classrooms
        const updateClassrooms = await Classroom.updateMany(
          { students: userId },
          { $pull: { students: userId } }
        );
        totalClassroomsUpdated += updateClassrooms.modifiedCount;

        // 4. If teacher/admin, reassign their badges
        if ((user.role === 'teacher' || user.role === 'admin') && superAdminId) {
          const updateBadges = await Badge.updateMany(
            { creatorId: userId },
            { $set: { creatorId: superAdminId._id } }
          );
          totalBadgesReassigned += updateBadges.modifiedCount;
        }

        // 5. Delete the user
        await User.findByIdAndDelete(userId);

        deletionResults.push({
          success: true,
          id: userId,
          name: user.name,
          email: user.email,
          role: user.role
        });
      } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
        deletionResults.push({
          success: false,
          id: userId,
          name: user.name,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Deleted ${deletionResults.filter(r => r.success).length} users`,
      summary: {
        requested: userIds.length,
        protected: protectedUsers.length,
        deleted: deletionResults.filter(r => r.success).length,
        failed: deletionResults.filter(r => !r.success).length,
        submissionsDeleted: totalSubmissionsDeleted,
        earnedBadgesDeleted: totalEarnedBadgesDeleted,
        classroomsUpdated: totalClassroomsUpdated,
        badgesReassigned: totalBadgesReassigned
      },
      protectedUsers,
      results: deletionResults
    });
  } catch (error) {
    console.error('Error in bulk user deletion:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 