import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Invitation } from '@/lib/models';

// Super admin email constant
const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

/**
 * DELETE /api/users/invite/[userId]
 * Deletes a user invitation
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission
    const userEmail = session.user.email;
    const userRole = (session.user as any).role;
    
    const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL;
    const isAdmin = userRole === 'admin';
    const isTeacher = userRole === 'teacher';
    
    if (!isSuperAdmin && !isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get invitation ID from URL parameters
    const { userId } = params;
    
    await dbConnect();
    
    // Find the invitation
    const invitation = await Invitation.findById(userId);
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has permission to delete this invitation
    // Teachers can only delete invitations they created
    if (isTeacher && !isAdmin && !isSuperAdmin && invitation.invitedBy !== userEmail) {
      return NextResponse.json(
        { error: 'You can only delete invitations that you created' },
        { status: 403 }
      );
    }
    
    // Delete the invitation
    await Invitation.findByIdAndDelete(userId);
    
    return NextResponse.json({ message: 'Invitation deleted successfully' });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
} 