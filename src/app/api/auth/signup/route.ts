import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';

const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || 'admin-2024-secure';
const TEACHER_INVITE_CODE = process.env.TEACHER_INVITE_CODE || 'teacher-2024-secure';

export async function POST(request: Request) {
  try {
    const { name, email, password, role, inviteCode } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate role and invite code
    let finalRole = 'student';
    if (role) {
      if (!['student', 'teacher', 'admin'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }

      if (role === 'admin') {
        if (!inviteCode || inviteCode !== ADMIN_INVITE_CODE) {
          return NextResponse.json(
            { error: 'Invalid invite code for admin role' },
            { status: 403 }
          );
        }
        finalRole = 'admin';
      } else if (role === 'teacher') {
        if (!inviteCode || inviteCode !== TEACHER_INVITE_CODE) {
          return NextResponse.json(
            { error: 'Invalid invite code for teacher role' },
            { status: 403 }
          );
        }
        finalRole = 'teacher';
      }
    }

    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: finalRole
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toObject();

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error in signup:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      },
      { status: 500 }
    );
  }
} 