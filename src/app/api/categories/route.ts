import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Category, User, Badge } from '@/lib/models';

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

// Get all categories
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const categories = await Category.find({}).sort('name');
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create a new category (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and super admin can create categories
    const isAdmin = (session?.user as any)?.role === 'admin';
    const isSuperAdmin = session.user.email === SUPER_ADMIN_EMAIL;
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await dbConnect();
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: data.name });
    if (existingCategory) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    // Create new category
    const category = await Category.create({
      name: data.name,
      description: data.description || '',
      color: data.color || 'purple'
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update categories (admin only)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and super admin can update categories
    const isAdmin = (session?.user as any)?.role === 'admin';
    const isSuperAdmin = session.user.email === SUPER_ADMIN_EMAIL;
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    
    // Validate request body
    if (!data.category || !data.category._id) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    await dbConnect();

    // Update category
    const { _id, name, description, color } = data.category;
    const updateBadges = data.updateBadges || false;
    
    // Check if name is being changed and if it conflicts with existing category
    if (name) {
      const existingCategory = await Category.findOne({ 
        name, 
        _id: { $ne: _id } 
      });
      if (existingCategory) {
        return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
      }
    }

    // Find previous category data to check for name changes
    const previousCategory = await Category.findById(_id);
    if (!previousCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const isNameChanged = previousCategory.name !== name && name;
    console.log('Category name change detected:', { 
      oldName: previousCategory.name, 
      newName: name, 
      isNameChanged, 
      updateBadges 
    });

    const updatedCategory = await Category.findByIdAndUpdate(
      _id,
      { 
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // If category name changed and updateBadges flag is set, update all badges with this category
    if (isNameChanged && updateBadges) {
      try {
        console.log('Starting badge updates for category name change', {
          oldName: previousCategory.name,
          newName: name,
          updateBadges
        });

        // First get count of badges with old category name for verification
        const badgeCount = await Badge.countDocuments({ category: previousCategory.name });
        console.log(`Found ${badgeCount} badges with category name "${previousCategory.name}"`);
        
        // Update all badges with the old category name
        const updateResult = await Badge.updateMany(
          { category: previousCategory.name },
          { $set: { category: name } }
        );
        
        console.log(`Updated ${updateResult.modifiedCount} badges from category "${previousCategory.name}" to "${name}"`);
        
        // Verify the update
        const updatedBadgeCount = await Badge.countDocuments({ category: name });
        const oldCategoryRemainingCount = await Badge.countDocuments({ category: previousCategory.name });
        
        console.log(`After update: ${updatedBadgeCount} badges with new category "${name}", ${oldCategoryRemainingCount} badges still with old category "${previousCategory.name}"`);
        
        // List all badges with old category for debugging
        if (oldCategoryRemainingCount > 0) {
          const remainingBadges = await Badge.find({ category: previousCategory.name });
          console.log('Badges still with old category:', remainingBadges.map((b: any) => ({ id: b._id, name: b.name })));
        }
        
        // If there are still badges with old category, try a second approach
        if (oldCategoryRemainingCount > 0) {
          console.log(`Attempting secondary update for remaining ${oldCategoryRemainingCount} badges...`);
          
          // Get all badges that still have the old category name
          const badgesNeedingUpdate = await Badge.find({ category: previousCategory.name }).lean();
          
          // Log the badge objects
          console.log('Badges needing update:', JSON.stringify(badgesNeedingUpdate.slice(0, 2))); // Just log first 2 for brevity
          
          // Update each one individually
          for (const badge of badgesNeedingUpdate) {
            console.log(`Attempting to update badge ${badge._id}`);
            try {
              const result = await Badge.updateOne(
                { _id: badge._id },
                { $set: { category: name } }
              );
              console.log(`Result for badge ${badge._id}:`, result);
            } catch (err) {
              console.error(`Error updating individual badge ${badge._id}:`, err);
            }
          }
          
          // Final verification
          const finalOldCount = await Badge.countDocuments({ category: previousCategory.name });
          const finalNewCount = await Badge.countDocuments({ category: name });
          console.log(`Final counts: ${finalNewCount} badges with "${name}", ${finalOldCount} badges with "${previousCategory.name}"`);
        }
      } catch (badgeUpdateError) {
        console.error('Error updating badges:', badgeUpdateError);
        // We continue even if badge update fails - the category was updated successfully
      }
    }

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete categories (admin only)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admin can delete categories
    if (session.user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    await dbConnect();

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 