import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import sgMail from '@sendgrid/mail';

// Set SendGrid API key from environment variable
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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
    
    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: userId },
    });
    
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
    
    const updatedInvitation = await prisma.invitation.update({
      where: { id: userId },
      data: {
        status: 'pending',
        expiresAt,
      },
    });
    
    // Generate sign-up link
    const signupUrl = `${process.env.NEXTAUTH_URL}/register?token=${invitation.token}`;
    
    // Send invitation email if SendGrid is configured
    if (process.env.SENDGRID_API_KEY) {
      try {
        const msg = {
          to: invitation.email,
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          subject: 'Invitation to join the Badge System (Reminder)',
          text: `You have been invited to join the Badge System as a ${invitation.role}. Click the link below to create your account:\n\n${signupUrl}\n\nThis invitation will expire in 48 hours.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You're invited to join the Badge System!</h2>
              <p>This is a reminder that you have been invited to join the Badge System as a <strong>${invitation.role}</strong>.</p>
              <p>Click the button below to create your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Accept Invitation
                </a>
              </div>
              <p>Or copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; color: #666;">${signupUrl}</p>
              <p style="margin-top: 30px; font-size: 14px; color: #999;">This invitation will expire in 48 hours.</p>
            </div>
          `,
        };
        
        await sgMail.send(msg);
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // We continue even if email fails, but log the error
      }
    } else {
      console.warn('SendGrid API key not configured. Skipping email notification.');
    }
    
    return NextResponse.json({ 
      message: 'Invitation resent successfully',
      invitation: {
        id: updatedInvitation.id,
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