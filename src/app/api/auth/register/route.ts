import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import { prisma } from '@/lib/prisma';

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

    // Check for token validity in the invitation system
    let invitation;
    try {
      invitation = await prisma.invitation.findFirst({
        where: {
          token: token,
          status: 'pending',
          email: email
        }
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

      console.log('Valid invitation found:', { id: invitation.id, email: invitation.email, role: invitation.role });
    } catch (prismaError) {
      console.error('Error checking invitation token:', prismaError);
      return NextResponse.json(
        { error: 'Failed to validate invitation token' },
        { status: 500 }
      );
    }

    await dbConnect();

    // Check if user exists in either MongoDB or Prisma
    const [mongoUser, prismaUser] = await Promise.all([
      User.findOne({ email }),
      prisma.user.findUnique({ where: { email } })
    ]);

    if (mongoUser && prismaUser) {
      console.log('User already exists in both MongoDB and Prisma:', email);
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('Creating or synchronizing user with role:', invitation.role);

    try {
      let user;
      
      // If user exists in MongoDB but not in Prisma
      if (mongoUser && !prismaUser) {
        console.log('User exists in MongoDB but not in Prisma, synchronizing...');
        try {
          await prisma.user.create({
            data: {
              name: mongoUser.name,
              email: mongoUser.email,
              password: mongoUser.password,
              role: mongoUser.role,
              requirePasswordChange: mongoUser.requirePasswordChange
            }
          });
          user = mongoUser;
        } catch (prismaError) {
          console.error('Error synchronizing user to Prisma:', prismaError);
          // Continue with MongoDB user
          user = mongoUser;
        }
      }
      // If user exists in Prisma but not in MongoDB
      else if (!mongoUser && prismaUser) {
        console.log('User exists in Prisma but not in MongoDB, synchronizing...');
        try {
          user = await User.create({
            name: prismaUser.name,
            email: prismaUser.email,
            password: prismaUser.password,
            role: prismaUser.role,
            requirePasswordChange: prismaUser.requirePasswordChange
          });
        } catch (mongoError) {
          console.error('Error synchronizing user to MongoDB:', mongoError);
          return NextResponse.json(
            { error: 'Failed to synchronize user account' },
            { status: 500 }
          );
        }
      }
      // If user doesn't exist in either system
      else {
        console.log('Creating new user in both systems');
        try {
          // Create user in MongoDB first
          user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: invitation.role,
            requirePasswordChange: true
          });

          // Then create in Prisma
          await prisma.user.create({
            data: {
              name,
              email,
              password: hashedPassword,
              role: invitation.role,
              requirePasswordChange: true
            }
          });
        } catch (error) {
          console.error('Error creating user in both systems:', error);
          // Try to clean up if one succeeded but the other failed
          if (user) {
            try {
              await User.deleteOne({ _id: user._id });
            } catch (cleanupError) {
              console.error('Error cleaning up MongoDB user:', cleanupError);
            }
          }
          return NextResponse.json(
            { error: 'Failed to create user account consistently' },
            { status: 500 }
          );
        }
      }

      // Mark invitation as accepted
      try {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'accepted' }
        });
        console.log('Invitation marked as accepted');
      } catch (updateError) {
        console.error('Error updating invitation status:', updateError);
        // Continue anyway, since user is created/synchronized
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