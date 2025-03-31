import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import sgMail from '@sendgrid/mail';

// Set SendGrid API key from environment variable
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function POST(req: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Find the pending invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        status: 'pending'
      }
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'No pending invitation found for this email' },
        { status: 404 }
      );
    }
    
    // Generate sign-up link
    const signupUrl = `${process.env.NEXTAUTH_URL}/register?token=${invitation.token}&email=${encodeURIComponent(invitation.email)}`;
    
    // Add note about password reset requirement in the email
    const passwordNote = "You will be required to change your password when you first login.";
    
    // Send invitation email if SendGrid is configured
    if (process.env.SENDGRID_API_KEY) {
      try {
        const msg = {
          to: invitation.email,
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          subject: 'Invitation to join the Badge System',
          text: `You have been invited to join the Badge System as a ${invitation.role}. Click the link below to create your account:\n\n${signupUrl}\n\n${passwordNote}\n\nThis invitation will expire in 48 hours.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You're invited to join the Badge System!</h2>
              <p>You have been invited to join the Badge System as a <strong>${invitation.role}</strong>.</p>
              <p>Click the button below to create your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Accept Invitation
                </a>
              </div>
              <p>Or copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; color: #666;">${signupUrl}</p>
              <p style="color: #d97706; font-weight: bold;">${passwordNote}</p>
              <p style="margin-top: 30px; font-size: 14px; color: #999;">This invitation will expire in 48 hours.</p>
            </div>
          `,
        };
        
        await sgMail.send(msg);
        return NextResponse.json({ message: 'Invitation email resent successfully' });
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        return NextResponse.json(
          { error: 'Failed to send invitation email' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
} 