import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import { Types } from 'mongoose';

interface Student {
  _id: Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  role: string;
  __v: number;
}

interface QueryType {
  role: string;
  classrooms?: { $in: Types.ObjectId[] };
}

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow admins, super admin, and teachers
    const isAdmin = (session?.user as any)?.role === 'admin';
    const isSuperAdmin = session.user.email === SUPER_ADMIN_EMAIL;
    const isTeacher = (session?.user as any)?.role === 'teacher';
    
    if (!isAdmin && !isSuperAdmin && !isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // All teachers can now view all students
    const query = { role: 'student' };
    
    // Fetch students based on query
    const students = (await User.find(query)
      .select('name email image role')
      .sort('name')
      .lean()) as unknown as Student[];
    
    // Format the response
    const formattedStudents = students.map(student => ({
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      image: student.image
    }));

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 