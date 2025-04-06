import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Invitation } from '@/lib/models';

// Super admin email constant
const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

/**
 * POST /api/users/invite/[userId]/resend
 * Resends a user invitation
 */
export async function POST(
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
    
    // Check if the invitation is already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Cannot resend an accepted invitation' },
        { status: 400 }
      );
    }
    
    // Check if the user has permission to resend this invitation
    // Teachers can only resend invitations they created
    if (isTeacher && !isAdmin && !isSuperAdmin && invitation.invitedBy !== userEmail) {
      return NextResponse.json(
        { error: 'You can only resend invitations that you created' },
        { status: 403 }
      );
    }
    
    // Update invitation - reset expiry date and ensure status is pending
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    
    const updatedInvitation = await Invitation.findByIdAndUpdate(
      userId,
      {
        status: 'pending',
        expiresAt,
      },
      { new: true }
    );
    
    return NextResponse.json({ 
      message: 'Invitation resent successfully',
      invitation: {
        id: updatedInvitation._id,
        email: updatedInvitation.email,
        role: updatedInvitation.role,
        status: updatedInvitation.status,
        expiresAt: updatedInvitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
} 