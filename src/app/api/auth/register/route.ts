import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import { User, Invitation } from '@/lib/models';

export async function POST(request: Request) {
  try {
    const { name, email, password, token } = await request.json();

    console.log('Registration attempt with:', { name, email, hasPassword: !!password, hasToken: !!token });

    if (!name || !email || !password || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check for token validity in the invitation system
    let invitation;
    try {
      invitation = await Invitation.findOne({
        token: token,
        status: 'pending',
        email: email
      });

      if (!invitation) {
        console.log('No valid invitation found for token:', token);
        return NextResponse.json(
          { error: 'Invalid or expired invitation token' },
          { status: 400 }
        );
      }

      // Check if token is expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        console.log('Invitation token expired:', token);
        return NextResponse.json(
          { error: 'Invitation token has expired' },
          { status: 400 }
        );
      }

      console.log('Valid invitation found:', { id: invitation._id, email: invitation.email, role: invitation.role });
    } catch (error) {
      console.error('Error checking invitation token:', error);
      return NextResponse.json(
        { error: 'Failed to validate invitation token' },
        { status: 500 }
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log('User already exists:', email);
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('Creating new user with role:', invitation.role);

    try {
      // Create user in MongoDB
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: invitation.role,
        requirePasswordChange: true
      });

      // Mark invitation as accepted
      try {
        await Invitation.findByIdAndUpdate(invitation._id, { status: 'accepted' });
        console.log('Invitation marked as accepted');
      } catch (updateError) {
        console.error('Error updating invitation status:', updateError);
        // Continue anyway, since user is created
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user.toObject();

      return NextResponse.json({
        ...userWithoutPassword,
        message: 'Registration successful. You will need to change your password on first login.'
      });
    } catch (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Failed to create user account', details: createError instanceof Error ? createError.message : String(createError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 