import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Super admin email constant
const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

/**
 * PUT /api/users/[userId]/role
 * Updates a user's role
 */
export async function PUT(
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
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Only admins can update roles' }, { status: 403 });
    }
    
    // Get user ID from URL parameters
    const { userId } = params;
    
    // Parse request body
    const body = await req.json();
    
    // Validate input
    if (!body.role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }
    
    const { role } = body;
    
    // Validate role
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Special permissions check
    
    // Only super admin can modify the super admin
    if (user.email === SUPER_ADMIN_EMAIL && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Cannot change super admin role' },
        { status: 403 }
      );
    }
    
    // Only super admin can promote to admin role
    if (role === 'admin' && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only super admins can promote users to admin role' },
        { status: 403 }
      );
    }
    
    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
    });
    
    return NextResponse.json({
      message: 'User role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
} 