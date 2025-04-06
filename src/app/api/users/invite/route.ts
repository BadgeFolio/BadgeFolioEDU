import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User, Invitation } from '@/lib/models';
import { randomBytes } from 'crypto';
import sgMail from '@sendgrid/mail';

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
    
    await dbConnect();
    let invitations = [];
    
    try {
      // Fetch invitations
      invitations = await Invitation.find({})
        .sort({ status: 1, createdAt: -1 });
      
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
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      console.log('User already exists:', normalizedEmail);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({ 
      email: normalizedEmail,
      status: 'pending'
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
      // Create invitation record
      const invitation = await Invitation.create({
        email: normalizedEmail,
        role,
        token,
        defaultPassword,
        status: 'pending',
        expiresAt,
        invitedBy: userEmail,
      });
      
      console.log('Invitation created successfully with ID:', invitation._id);
      
      // Send invitation email
      const inviteUrl = `${process.env.NEXTAUTH_URL}/signup?token=${token}`;
      
      const msg = {
        to: normalizedEmail,
        from: 'noreply@badgefolio.com',
        subject: 'Invitation to Join BadgeFolio',
        text: `You have been invited to join BadgeFolio as a ${role}. Click the following link to complete your registration: ${inviteUrl}`,
        html: `
          <h1>Welcome to BadgeFolio!</h1>
          <p>You have been invited to join BadgeFolio as a ${role}.</p>
          <p>Click the button below to complete your registration:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Complete Registration</a>
          <p>This invitation will expire in 48 hours.</p>
        `,
      };
      
      try {
        await sgMail.send(msg);
        console.log('Invitation email sent successfully');
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't fail the request if email fails
      }
      
      return NextResponse.json(invitation);
    } catch (createError) {
      console.error('Error creating invitation:', createError);
      return NextResponse.json(
        { 
          error: 'Failed to create invitation',
          details: createError instanceof Error ? createError.message : String(createError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing invitation request:', error);
    return NextResponse.json(
      { error: 'Failed to process invitation request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 