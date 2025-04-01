'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import { User } from '@/lib/models';
import dbConnect from '@/lib/mongoose';

interface Badge {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  difficulty: string;
}

interface Submission {
  _id: string;
  badgeId: Badge;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface UserWithSubmissions {
  submissions: Submission[];
}

interface PortfolioProps {
  userId: string;
}

async function getSubmissions(userId: string) {
  await dbConnect();
  const user = await User.findById(userId)
    .populate('submissions.badgeId')
    .select('submissions')
    .lean();
  
  if (!user || !('submissions' in user)) {
    return [];
  }

  return (user as unknown as UserWithSubmissions).submissions;
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

function PortfolioContent({ submissions }: { submissions: Submission[] }) {
  const approvedSubmissions = submissions.filter(sub => sub.status === 'approved');

  if (approvedSubmissions.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4">
        No badges earned yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {approvedSubmissions.map(submission => (
        <div key={submission._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="relative w-full h-48 mb-4">
            <Image
              src={submission.badgeId.imageUrl}
              alt={submission.badgeId.name}
              fill
              className="object-contain"
            />
          </div>
          <h3 className="text-xl font-semibold mb-2 dark:text-white">{submission.badgeId.name}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-2">{submission.badgeId.description}</p>
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>{submission.badgeId.category}</span>
            <span className="capitalize">{submission.badgeId.difficulty}</span>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Earned on {new Date(submission.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export async function Portfolio({ userId }: PortfolioProps) {
  const submissions = await getSubmissions(userId);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PortfolioContent submissions={submissions} />
    </Suspense>
  );
} 