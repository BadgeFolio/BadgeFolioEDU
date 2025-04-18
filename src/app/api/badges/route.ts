import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User, Badge, Category } from '@/lib/models';
import { v2 as cloudinary } from 'cloudinary';
import { SortOrder } from 'mongoose';
import { isSuperAdmin } from '@/lib/email';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validate Cloudinary configuration
const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET
);

// Configure Cloudinary if all needed env vars are present
if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('Warning: Cloudinary is not properly configured. Image uploads will not work.');
}

interface CloudinaryResult {
  secure_url: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get the current user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only teachers can create badges
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only teachers and administrators can create badges' }, { status: 403 });
    }

    const formData = await request.formData();
    console.log('Received form data:', {
      name: formData.get('name'),
      description: formData.get('description'),
      criteria: formData.get('criteria'),
      difficulty: formData.get('difficulty'),
      category: formData.get('category'),
      hasImage: formData.has('image')
    });

    // Validate category exists
    const categoryName = formData.get('category')?.toString() || '';
    let category = await Category.findOne({ name: categoryName });
    
    // If category doesn't exist, create it (only for known categories)
    try {
      if (!category && categoryName.toLowerCase() === 'scratch') {
        category = await Category.create({
          name: 'Scratch',
          description: 'Scratch Programming',
          color: '#F6A619' // Scratch's brand color
        });
        console.log('Created Scratch category:', category);
      }
    } catch (error) {
      console.error('Error creating Scratch category:', error instanceof Error ? error.message : 'Unknown error');
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Create badge data
    const badgeData: {
      name: FormDataEntryValue | null;
      description: FormDataEntryValue | null;
      criteria: FormDataEntryValue | null;
      difficulty: number;
      category: string;
      creatorId: any;
      isPublic: boolean;
      image?: string;
    } = {
      name: formData.get('name'),
      description: formData.get('description'),
      criteria: formData.get('criteria'),
      difficulty: Number(formData.get('difficulty')),
      category: category.name, // Use the category name from the database
      creatorId: user._id,
      isPublic: formData.get('isPublic') === 'true'
    };

    // Validate badge data before creation
    try {
      const badge = new Badge(badgeData);
      await badge.validate();
    } catch (validationError: any) {
      console.error('Badge validation error:', validationError);
      return NextResponse.json({ 
        error: 'Badge validation failed',
        details: validationError.errors
      }, { status: 400 });
    }

    // Handle image upload if present
    const imageFile = formData.get('image') as File;
    if (imageFile) {
      // Check if Cloudinary is configured
      if (!cloudinaryConfigured) {
        console.error('Cloudinary not configured, skipping image upload');
        return NextResponse.json({ 
          error: 'Image upload failed', 
          details: 'Cloudinary is not configured properly' 
        }, { status: 500 });
      }
      
      try {
        console.log('Processing image upload...');
        // Convert the file to a buffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          console.log('Starting Cloudinary upload...');
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'badges',
              transformation: [
                { width: 500, height: 500, crop: 'fill' },
                { quality: 'auto:best' }
              ]
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('Cloudinary upload successful');
                resolve(result);
              }
            }
          );

          // Create a readable stream from the buffer and pipe it to the upload stream
          const { Readable } = require('stream');
          const bufferStream = Readable.from(buffer);
          bufferStream.pipe(uploadStream);
        });

        if (!result || !(result as any).secure_url) {
          throw new Error('Failed to get image URL from Cloudinary');
        }

        badgeData.image = (result as any).secure_url;
        console.log('Image URL received:', badgeData.image);
      } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
          { error: 'Failed to upload image', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Create the badge
    const badge = await Badge.create(badgeData);
    
    return NextResponse.json(badge);
  } catch (error) {
    console.error('Error creating badge:', error);
    return NextResponse.json({ 
      error: 'Failed to create badge',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const isPublic = searchParams.get('isPublic');
    const recent = searchParams.get('recent');
    const approvalStatus = searchParams.get('approvalStatus');
    const createdByMe = searchParams.get('createdByMe');

    // Build the query
    const query: any = {};
    
    // If recent parameter is specified, get recent published badges
    if (recent === 'true') {
      query.isPublic = true;
      // Limit to badges published in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.createdAt = { $gte: thirtyDaysAgo };
    } else {
      // Regular query logic for badges
      // If not logged in, only show public badges
      if (!session?.user?.email) {
        query.isPublic = true;
      } else {
        // Get user role
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const userIsSuperAdmin = isSuperAdmin(user?.email);
        
        // If createdByMe is true, only show badges created by the current user
        if (createdByMe === 'true') {
          query.creatorId = user._id;
        }
        // If not super admin and creatorId is specified, apply the filter
        else if (!userIsSuperAdmin && creatorId) {
          query.creatorId = creatorId;
        }
        // If not super admin and isPublic is specified, apply the filter
        else if (!userIsSuperAdmin && isPublic !== null) {
          query.isPublic = isPublic === 'true';
        }
        
        // If not super admin and not a specific query, show public badges and own badges
        if (!userIsSuperAdmin && !creatorId && isPublic === null && createdByMe !== 'true') {
          query.$or = [
            { isPublic: true },
            { creatorId: user?._id }
          ];
        }

        // For teachers and admins, allow filtering by approval status
        if ((user.role === 'teacher' || user.role === 'admin') && approvalStatus) {
          query.approvalStatus = approvalStatus;
        }
      }
    }
    
    // Sort by createdAt if getting recent badges, otherwise default sort
    const sortOption = recent === 'true' ? { createdAt: -1 as SortOrder } : undefined;

    const badges = await Badge.find(query)
      .populate('creatorId', 'email name')
      .populate('approvedBy', 'email name')
      .sort(sortOption)
      .limit(recent === 'true' ? 10 : 100) // Limit to 10 most recent badges
      .lean();

    // Get all categories for lookup
    const categories = await Category.find({}).lean();
    const categoryMap = new Map(categories.map((cat: any) => [cat.name, cat]));

    // Format badges to include both id and _id
    const formattedBadges = badges.map((badge: any) => {
      // Find the category object for this badge
      const categoryObj = categoryMap.get(badge.category);
      
      return {
        ...badge,
        id: badge._id.toString(),
        _id: badge._id.toString(),
        category: categoryObj || badge.category,
        creatorId: badge.creatorId ? {
          ...badge.creatorId,
          id: badge.creatorId._id.toString(),
          _id: badge.creatorId._id.toString()
        } : undefined,
        approvedBy: badge.approvedBy ? {
          ...badge.approvedBy,
          id: badge.approvedBy._id.toString(),
          _id: badge.approvedBy._id.toString()
        } : undefined
      };
    });

    return NextResponse.json(formattedBadges);
  } catch (error) {
    console.error('Error in badges API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch badges', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      },
      { status: 500 }
    );
  }
} 