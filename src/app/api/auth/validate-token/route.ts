import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { Invitation } from '@/lib/models';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const email = url.searchParams.get('email');

  await dbConnect();

  // If we only have email, we're checking if there's a pending invitation for this email
  if (!token && email) {
    try {
      console.log('Checking for pending invitation for email:', email);
      const invitation = await Invitation.findOne({
        email: email,
        status: 'pending',
      });

      if (!invitation) {
        console.log('No pending invitation found for email:', email);
        return NextResponse.json({ 
          valid: false, 
          message: 'No pending invitation found for this email' 
        });
      }

      // Check if token is expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        console.log('Invitation expired for email:', email);
        return NextResponse.json({ 
          valid: false, 
          message: 'Invitation has expired' 
        });
      }

      console.log('Valid pending invitation found for email:', email);
      return NextResponse.json({ 
        valid: true, 
        invitation: {
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        }
      });
    } catch (error) {
      console.error('Error checking invitation by email:', error);
      return NextResponse.json(
        { error: 'Failed to check invitation status' },
        { status: 500 }
      );
    }
  }

  // Normal token validation logic
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    console.log('Validating token:', token);
    const invitation = await Invitation.findOne({
      token: token,
      status: 'pending',
      ...(email ? { email } : {})
    });

    if (!invitation) {
      console.log('No valid invitation found for token');
      return NextResponse.json({ 
        valid: false, 
        message: 'Invalid or expired invitation token' 
      });
    }

    // Check if token is expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      console.log('Invitation token expired');
      return NextResponse.json({ 
        valid: false, 
        message: 'Invitation token has expired' 
      });
    }

    console.log('Valid invitation token for:', invitation.email);
    return NextResponse.json({ 
      valid: true, 
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation token' },
      { status: 500 }
    );
  }
} 