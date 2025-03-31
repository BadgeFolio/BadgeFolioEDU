import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { User } from '@/lib/models';
import dbConnect from '@/lib/mongoose';
import { ClientPortfolio } from '@/components/portfolio/ClientPortfolio';
import { Types } from 'mongoose';

interface Props {
  params: {
    userId: string;
  };
}

interface Student {
  _id: Types.ObjectId;
  name: string;
  email: string;
  image?: string;
}

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

export default async function StudentPortfolioPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  // Check authentication
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Check admin permissions
  const isAdmin = (session?.user as any)?.role === 'admin';
  const isSuperAdmin = session.user.email === SUPER_ADMIN_EMAIL;
  
  if (!isAdmin && !isSuperAdmin) {
    redirect('/');
  }

  await dbConnect();

  // Fetch student details
  const student = await User.findById(params.userId)
    .select('name email image')
    .lean() as unknown as Student;

  if (!student) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Student Not Found</h1>
        <p>The requested student profile could not be found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{student.name}'s Portfolio</h1>
        <p className="text-gray-600">{student.email}</p>
      </div>
      
      <ClientPortfolio userId={params.userId} />
    </div>
  );
} 