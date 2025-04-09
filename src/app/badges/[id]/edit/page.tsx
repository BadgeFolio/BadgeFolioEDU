'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Category } from '@/types';

interface Badge {
  _id: string;
  name: string;
  description: string;
  criteria: string;
  category: string;
  difficulty: number;
  image?: string;
  isPublic: boolean;
  creatorId: string;
}

export default function EditBadgePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [badge, setBadge] = useState<Badge | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if ((session?.user as any)?.role !== 'teacher' && (session?.user as any)?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [badgeRes, categoriesRes] = await Promise.all([
          fetch(`/api/badges/${params.id}`),
          fetch('/api/categories')
        ]);

        if (!badgeRes.ok) {
          throw new Error('Failed to fetch badge');
        }
        if (!categoriesRes.ok) {
          throw new Error('Failed to fetch categories');
        }

        const [badgeData, categoriesData] = await Promise.all([
          badgeRes.json(),
          categoriesRes.json()
        ]);

        setBadge(badgeData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [params.id, status]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!badge) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/badges/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(badge),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update badge');
      }

      toast.success('Badge updated successfully');
      router.push(`/badges/${params.id}`);
    } catch (error) {
      console.error('Error updating badge:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update badge');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  if (!badge) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Badge not found.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700 sm:px-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Badge</h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white dark:bg-gray-800">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Badge Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={badge.name}
                  onChange={(e) => setBadge({ ...badge, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <select
                  id="category"
                  value={badge.category}
                  onChange={(e) => setBadge({ ...badge, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  required
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  value={badge.description}
                  onChange={(e) => setBadge({ ...badge, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="criteria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Criteria
                </label>
                <textarea
                  id="criteria"
                  value={badge.criteria}
                  onChange={(e) => setBadge({ ...badge, criteria: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Difficulty Level
                </label>
                <div className="mt-1 flex items-center">
                  {Array(5).fill(0).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setBadge({ ...badge, difficulty: index + 1 })}
                      className="focus:outline-none"
                    >
                      <svg
                        className={`h-8 w-8 ${
                          index < badge.difficulty ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-500'
                        } cursor-pointer hover:text-yellow-400 transition-colors duration-150`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    {badge.difficulty} of 5
                  </span>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={badge.isPublic}
                  onChange={(e) => setBadge({ ...badge, isPublic: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-500 rounded dark:bg-gray-700"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Make this badge public
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 