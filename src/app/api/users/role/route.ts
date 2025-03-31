import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import bcrypt from 'bcryptjs';

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role, newPassword } = await request.json();

    // Validate role if provided
    if (role && role !== 'student' && role !== 'teacher' && role !== 'admin') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Connect to MongoDB
    await dbConnect();

    // Get the current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Get the target user
    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check permissions based on current user's role and target role
    if (currentUser.role === 'student') {
      return NextResponse.json({ 
        error: 'Students cannot modify roles' 
      }, { status: 403 });
    }

    // Update data object that will be used for updating the user
    const updateData: any = {};
    
    // Super admin can do anything
    if (session.user.email === SUPER_ADMIN_EMAIL) {
      // Update role if provided
      if (role) {
        updateData.role = role;
      }
      
      // Update password if provided
      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateData.password = hashedPassword;
        updateData.requirePasswordChange = true;
      }

      // Update the user
      const updatedUser = await User.findOneAndUpdate(
        { email },
        updateData,
        { 
          new: true,
          runValidators: true
        }
      );

      if (!updatedUser) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'User updated successfully',
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          image: updatedUser.image,
          passwordReset: !!newPassword
        }
      });
    }

    if (currentUser.role === 'teacher') {
      // Teachers can now:
      // 1. Upgrade students to teachers
      // 2. Reset student passwords
      
      if (role && (targetUser.role !== 'student' || role !== 'teacher')) {
        return NextResponse.json({ 
          error: 'Teachers can only upgrade students to teacher role' 
        }, { status: 403 });
      }
      
      // Teachers can reset passwords only for students
      if (newPassword && targetUser.role !== 'student') {
        return NextResponse.json({ 
          error: 'Teachers can only reset passwords for students' 
        }, { status: 403 });
      }
      
      // Add role to update data if it's provided
      if (role) {
        updateData.role = role;
      }
      
      // Add password to update data if it's provided
      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateData.password = hashedPassword;
        updateData.requirePasswordChange = true;
      }
    }

    if (currentUser.role === 'admin') {
      // Admins can upgrade students to teachers and teachers to admins
      if (role) {
        if (
          (targetUser.role === 'student' && role !== 'teacher') ||
          (targetUser.role === 'teacher' && role !== 'admin') ||
          targetUser.role === 'admin'
        ) {
          return NextResponse.json({ 
            error: 'Invalid role upgrade path' 
          }, { status: 403 });
        }
        
        updateData.role = role;
      }
      
      // Admins can reset passwords for all non-admin users
      if (newPassword && targetUser.role === 'admin') {
        return NextResponse.json({ 
          error: 'Admins cannot reset passwords for other admins' 
        }, { status: 403 });
      }
      
      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateData.password = hashedPassword;
        updateData.requirePasswordChange = true;
      }
    }

    // Only proceed with update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes to apply' }, { status: 400 });
    }

    // Update the user
    const updatedUser = await User.findOneAndUpdate(
      { email },
      updateData,
      { 
        new: true,
        runValidators: true
      }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Return the updated user
    return NextResponse.json({
      message: role ? 'Role updated successfully' : 'User updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        image: updatedUser.image,
        passwordReset: !!newPassword
      }
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add GET endpoint to fetch all users (for admins and teachers)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRole = (session.user as any)?.role;
    const isSuperAdmin = session.user.email === SUPER_ADMIN_EMAIL;
    const isAdmin = userRole === 'admin';
    const isTeacher = userRole === 'teacher';
    
    if (!isSuperAdmin && !isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    
    // Allow teachers to see all students
    let query = {};
    if (isTeacher) {
      query = { role: 'student' };
    }
    
    // Fetch users based on permissions
    const users = await User.find(query).select('name email role image').sort('email');
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 