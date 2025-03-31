import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import { randomBytes } from 'crypto';
import sgMail from '@sendgrid/mail';
import { Prisma, PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';

// Set SendGrid API key from environment variable
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Super admin email constant
const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

/**
 * GET /api/users/invite
 * Retrieves all user invitations
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
    const userEmail = session.user.email || '';
    const userRole = (session.user as any).role;
    
    console.log('GET /api/users/invite - Auth info:', {
      userEmail,
      userRole,
      isSessionValid: !!session
    });
    
    const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL;
    const isAdmin = userRole === 'admin';
    const isTeacher = userRole === 'teacher';
    
    if (!isSuperAdmin && !isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Retrieve all invitations
    console.log('Fetching invitations from database');
    
    let invitations = [];
    
    try {
      // Fetch invitations
      invitations = await prisma.invitation.findMany({
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' },
        ],
      });
      
      console.log(`Found ${invitations.length} invitations`);
    } catch (dbError) {
      console.error('Database error during invitation fetch:', dbError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch invitations from database',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error retrieving invitations:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve invitations', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/invite
 * Creates a new user invitation and sends email
 */
export async function POST(req: NextRequest) {
  console.log('POST /api/users/invite - Request received');
  
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      console.log('POST /api/users/invite - Unauthorized: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission
    const userEmail = session.user.email || '';
    const userRole = (session.user as any).role;
    
    console.log('POST /api/users/invite - Auth info:', {
      userEmail,
      userRole,
      isSessionValid: !!session
    });
    
    const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL;
    const isAdmin = userRole === 'admin';
    const isTeacher = userRole === 'teacher';
    
    if (!isSuperAdmin && !isAdmin && !isTeacher) {
      console.log('POST /api/users/invite - Forbidden: User lacks permission');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    console.log('POST /api/users/invite - Request body:', { ...body, defaultPassword: body.defaultPassword ? '****' : undefined });
    
    // Validate input
    if (!body.email || !body.role) {
      console.log('POST /api/users/invite - Bad request: Missing email or role');
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }
    
    const { email, role, defaultPassword } = body;
    
    // Ensure email is lowercase to avoid case-sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate password
    if (!defaultPassword || defaultPassword.length < 8) {
      return NextResponse.json(
        { error: 'Default password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Validate role (only super admins and admins can create admin invitations)
    if (role === 'admin' && !isSuperAdmin && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to create admin invitations' },
        { status: 403 }
      );
    }
    
    // Check if user already exists
    await dbConnect();
    const existingUserInMongo = await User.findOne({ email: normalizedEmail });
    
    if (existingUserInMongo) {
      console.log('User already exists in MongoDB:', normalizedEmail);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    const existingUserInPrisma = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    
    if (existingUserInPrisma) {
      console.log('User already exists in Prisma:', normalizedEmail);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: { 
        email: normalizedEmail,
        status: 'pending'
      },
    });
    
    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An active invitation for this email already exists' },
        { status: 400 }
      );
    }
    
    // Generate a token
    const token = randomBytes(32).toString('hex');
    
    // Set expiry date (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    
    console.log('Attempting to create invitation with data:', { 
      email: normalizedEmail, 
      role, 
      token: token.substring(0, 10) + '...',
      defaultPasswordLength: defaultPassword?.length, 
      expiresAt,
      invitedBy: userEmail
    });

    try {
      // Direct approach with imported PrismaClient for fresh instance
      let invitation;
      
      try {
        // Create a fresh client to avoid any cached schema issues
        const prismaTemp = new PrismaClient();
        
        console.log('Creating invitation with direct PrismaClient');
        
        // Create invitation record
        invitation = await prismaTemp.invitation.create({
          data: {
            email: normalizedEmail,
            role,
            token,
            defaultPassword,
            status: 'pending',
            expiresAt,
            invitedBy: userEmail,
          } as any  // Force TypeScript to accept this
        });
        
        // Disconnect when done
        await prismaTemp.$disconnect();
        
        console.log('Invitation created successfully with ID:', invitation.id);
      } catch (createError) {
        console.error('Error during invitation creation with fresh client:', createError);
        
        // Fallback to direct database access as last resort
        console.log('Trying fallback method...');
        
        try {
          // Get connection string from env
          const uri = process.env.DATABASE_URL || '';
          if (!uri) {
            throw new Error('DATABASE_URL environment variable not set');
          }
          const client = new MongoClient(uri);
          
          await client.connect();
          const database = client.db(); // Use default DB from connection string
          const collection = database.collection('Invitation');
          
          // Insert directly using MongoDB driver
          const result = await collection.insertOne({
            email: normalizedEmail,
            role,
            token,
            defaultPassword,
            status: 'pending',
            expiresAt,
            invitedBy: userEmail,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          invitation = {
            id: result.insertedId.toString(),
            email: normalizedEmail,
            role,
            status: 'pending',
            expiresAt
          };
          
          await client.close();
          console.log('Invitation created with fallback method, ID:', invitation.id);
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          throw new Error('All invitation creation methods failed');
        }
      }
      
      // Generate sign-up link
      const signupUrl = `${process.env.NEXTAUTH_URL}/register?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
      
      // Add note about password reset requirement in the email
      const passwordNote = "You will be required to change your password when you first login.";
    
      // Send invitation email if SendGrid is configured
      if (process.env.SENDGRID_API_KEY) {
        try {
          const msg = {
            to: normalizedEmail,
            from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
            subject: 'Invitation to join the Badge System',
            text: `You have been invited to join the Badge System as a ${role}. Click the link below to create your account:\n\n${signupUrl}\n\n${passwordNote}\n\nThis invitation will expire in 48 hours.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You're invited to join the Badge System!</h2>
                <p>You have been invited to join the Badge System as a <strong>${role}</strong>.</p>
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
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError);
          // We continue even if email fails, but log the error
        }
      } else {
        console.warn('SendGrid API key not configured. Skipping email notification.');
      }
      
      return NextResponse.json(
        { 
          message: 'Invitation created successfully',
          invitation: {
            id: invitation.id,
            email: normalizedEmail,
            role: role,
            status: 'pending',
            expiresAt: expiresAt
          },
          signupUrl
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      
      // Try to provide more specific error information
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error code:', error.code);
        console.error('Prisma error message:', error.message);
        
        // Handle specific Prisma errors
        if (error.code === 'P2002') {
          return NextResponse.json(
            { error: 'An invitation with this token already exists', details: error.message },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create invitation', 
          details: error instanceof Error ? error.message : String(error),
          errorType: error.constructor ? error.constructor.name : typeof error
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in main invitation flow:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process invitation request',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 