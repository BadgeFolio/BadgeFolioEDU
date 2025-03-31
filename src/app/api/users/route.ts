import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Super admin email constant
const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

/**
 * GET /api/users
 * Retrieves all users
 */
export async function GET(req: NextRequest) {
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
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    
    // Define filter conditions
    const whereClause: any = {};
    if (role) {
      whereClause.role = role;
    }
    
    // Retrieve all users based on filters
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        requirePasswordChange: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error retrieving users:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Creates a new user
 */
export async function POST(req: NextRequest) {
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
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    
    // Validate input
    if (!body.name || !body.email || !body.role) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      );
    }
    
    const { name, email, role, password } = body;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate role
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }
    
    // Only super admins can create admin users
    if (role === 'admin' && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only super admins can create admin users' },
        { status: 403 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        password, // This should be hashed before storing
        requirePasswordChange: true, // Require password change on first login
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });
    
    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: newUser
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 