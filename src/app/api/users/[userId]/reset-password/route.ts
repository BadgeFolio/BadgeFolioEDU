import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import bcrypt from 'bcryptjs';

// Super admin email constant
const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

/**
 * POST /api/users/[userId]/reset-password
 * Resets a user's password and marks it for required change
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
    const userRole = (session.user as any)?.role;
    
    const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL;
    const isAdmin = userRole === 'admin';
    const isTeacher = userRole === 'teacher';
    
    // Allow teachers to reset passwords as well
    if (!isSuperAdmin && !isAdmin && !isTeacher) {
      return NextResponse.json(
        { error: 'Forbidden - Only admins and teachers can reset passwords' }, 
        { status: 403 }
      );
    }
    
    // Get user ID from URL parameters
    const { userId } = params;
    
    // Parse request body
    const body = await req.json();
    
    // Validate password
    if (!body.newPassword || body.newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    const { newPassword } = body;
    
    await dbConnect();
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Permission checks based on roles
    
    // Super admin can't be force-reset
    if (user.email === SUPER_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Cannot reset super admin password' },
        { status: 403 }
      );
    }
    
    // Special permissions check - only super admin can reset admin passwords
    if (user.role === 'admin' && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only super admins can reset admin passwords' },
        { status: 403 }
      );
    }
    
    // Teachers can only reset student passwords
    if (isTeacher && user.role !== 'student') {
      return NextResponse.json(
        { error: 'Teachers can only reset student passwords' },
        { status: 403 }
      );
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user with new password and require password change flag
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      requirePasswordChange: true
    });
    
    return NextResponse.json({
      message: 'Password reset successfully. User will be required to change password on next login.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 