import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import { Types } from 'mongoose';

interface Teacher {
  _id: Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  role: string;
  __v: number;
}

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and super admin
    const isAdmin = (session?.user as any)?.role === 'admin';
    const isSuperAdmin = session.user.email === SUPER_ADMIN_EMAIL;
    
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    
    // Fetch all teachers
    const teachers = (await User.find({ role: 'teacher' })
      .select('name email image role')
      .sort('name')
      .lean()) as unknown as Teacher[];
    
    // Format the response
    const formattedTeachers = teachers.map(teacher => ({
      id: teacher._id.toString(),
      name: teacher.name,
      email: teacher.email,
      image: teacher.image
    }));

    return NextResponse.json(formattedTeachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 