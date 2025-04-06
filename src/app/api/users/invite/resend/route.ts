import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Invitation } from '@/lib/models';

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
    
    await dbConnect();
    
    // Find the pending invitation
    const invitation = await Invitation.findOne({
      email: email.toLowerCase().trim(),
      status: 'pending'
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'No pending invitation found for this email' },
        { status: 404 }
      );
    }
    
    // Update invitation - reset expiry date and ensure status is pending
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    
    const updatedInvitation = await Invitation.findByIdAndUpdate(
      invitation._id,
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