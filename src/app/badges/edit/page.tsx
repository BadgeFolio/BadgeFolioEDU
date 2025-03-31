'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';

interface Badge {
  _id: string;
  name: string;
  description: string;
  category: string;
  criteria: string[];
  imageUrl?: string;
}

export default function EditBadgesByCategory() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }

    if ((session?.user as any)?.role !== 'teacher') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await fetch('/api/badges');
        const data = await response.json();
        const filteredBadges = data.filter((badge: Badge) => badge.category === category);
        setBadges(filteredBadges);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };

    if (category && status === 'authenticated') {
      fetchBadges();
    }
  }, [category, status]);

  const handleEditBadge = (badgeId: string) => {
    router.push(`/badges/${badgeId}/edit`);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit {category} Badges</h1>
            <p className="mt-2 text-gray-600">Manage and edit badges in the {category} category</p>
          </div>
          <button
            onClick={() => router.push('/badges/create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Create New Badge
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge) => (
            <div
              key={badge._id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{badge.name}</h3>
                <button
                  onClick={() => handleEditBadge(badge._id)}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-4 line-clamp-2">{badge.description}</p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Criteria:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {badge.criteria.slice(0, 2).map((criterion, index) => (
                    <li key={index} className="line-clamp-1">{criterion}</li>
                  ))}
                  {badge.criteria.length > 2 && (
                    <li className="text-blue-600">+{badge.criteria.length - 2} more</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {badges.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No badges found in this category</h3>
            <p className="mt-2 text-gray-600">Create a new badge to get started</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 