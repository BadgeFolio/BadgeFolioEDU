'use client';

import { Badge, PopulatedBadge } from '@/types';
import { notFound, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import SubmissionForm from '@/components/submissions/SubmissionForm';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'react-hot-toast';
import { Session } from 'next-auth';
import { EyeIcon, EyeSlashIcon, ArrowPathIcon, LockClosedIcon, LockOpenIcon, PencilIcon, TrashIcon, CheckCircleIcon, ClockIcon, TrophyIcon, InformationCircleIcon, UserCircleIcon, StarIcon } from '@heroicons/react/24/outline';

interface ExtendedSession extends Session {
  user: {
    email: string;
    role: string;
  } & Session['user'];
}

interface BadgeCreator {
  _id: string;
  email: string;
  name?: string;
}

type PopulatedBadgeWithCreator = Omit<PopulatedBadge, 'creatorId'> & {
  creatorId: BadgeCreator;
};

export default function BadgePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const [badge, setBadge] = useState<PopulatedBadgeWithCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasEarnedBadge, setHasEarnedBadge] = useState(false);
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false);

  const isTeacherOrAdmin = session?.user?.role === 'teacher' || session?.user?.role === 'admin';
  const isCreator = badge?.creatorId?.email === session?.user?.email;
  const isAdmin = session?.user?.role === 'admin';
  const canModify = (isTeacherOrAdmin && isCreator) || isAdmin;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this badge? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/badges/${params.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete badge');
      }

      toast.success('Badge deleted successfully');
      router.push('/badges');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete badge');
      setIsDeleting(false);
    }
  };

  const toggleVisibility = async () => {
    if (!badge) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/badges/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...badge,
          isPublic: !badge.isPublic,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update badge visibility');
      }

      const updatedBadge = await res.json();
      setBadge(updatedBadge);
      toast.success(`Badge is now ${updatedBadge.isPublic ? 'public' : 'private'}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update badge visibility');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [badgeRes, submissionsRes] = await Promise.all([
          fetch(`/api/badges/${params.id}`),
          (session?.user as any)?.role === 'student' ? fetch('/api/submissions') : null
        ]);

        if (!badgeRes.ok) {
          throw new Error('Failed to fetch badge');
        }

        const badgeData = await badgeRes.json();
        setBadge(badgeData);

        if (submissionsRes) {
          const submissionsData = await submissionsRes.json();
          // Check if student has already earned this badge
          const hasEarned = submissionsData.some(
            (s: any) => s?.badgeId && typeof s.badgeId === 'object' && '_id' in s.badgeId && s.badgeId._id === params.id && s.status === 'approved'
          );
          
          // Check if student has a pending submission for this badge
          const hasPending = submissionsData.some(
            (s: any) => s?.badgeId && typeof s.badgeId === 'object' && '_id' in s.badgeId && s.badgeId._id === params.id && s.status === 'pending'
          );
          
          setHasEarnedBadge(hasEarned);
          setHasPendingSubmission(hasPending);
        }
      } catch (error) {
        console.error('Error:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [params.id, session]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !badge) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-red-600 dark:text-red-400">Error</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error || 'Badge not found'}</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-xl overflow-hidden sm:rounded-3xl">
          <div className="relative">
            {/* Decorative background pattern */}
            <div className="absolute top-0 left-0 w-full h-40 bg-primary-500/10 dark:bg-primary-900/20 
                           bg-[url('/pattern-confetti.svg')] bg-repeat z-0"></div>
            
            <div className="relative z-10 px-6 py-6 sm:px-8 sm:pt-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 
                                hover-scale inline-block">{badge.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className={`badge-category flex items-center ${
                      badge.isPublic 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {badge.isPublic ? 
                        <EyeIcon className="h-4 w-4 mr-1" /> : 
                        <EyeSlashIcon className="h-4 w-4 mr-1" />}
                      {badge.isPublic ? 'Public' : 'Private'}
                    </span>
                    {canModify && (
                      <button
                        onClick={toggleVisibility}
                        disabled={isUpdating}
                        className="badge-category bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100 hover:scale-105"
                      >
                        {isUpdating ? 
                          <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" /> : 
                          badge.isPublic ? <LockClosedIcon className="h-4 w-4 mr-1" /> : <LockOpenIcon className="h-4 w-4 mr-1" />}
                        {isUpdating ? 'Updating...' : `Make ${badge.isPublic ? 'Private' : 'Public'}`}
                      </button>
                    )}
                  </div>
                </div>
                {canModify && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push(`/badges/${params.id}/edit`)}
                      className="btn btn-primary"
                    >
                      <PencilIcon className="h-5 w-5 mr-2" />
                      Edit Badge
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="btn bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600"
                    >
                      {isDeleting ? 
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> :
                        <TrashIcon className="h-5 w-5 mr-2" />}
                      {isDeleting ? 'Deleting...' : 'Delete Badge'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-8 md:mt-12 flex flex-col md:flex-row gap-8">
                {badge.image && (
                  <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                    <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-gray-700 transform hover:rotate-2 transition-all duration-300">
                      <img
                        src={badge.image}
                        alt={badge.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <div className="flex items-center bg-white dark:bg-gray-700 rounded-full px-4 py-2 shadow-md">
                        {Array(5)
                          .fill(0)
                          .map((_, i) => (
                            <StarIcon
                              key={`star-${i}`}
                              className={`h-6 w-6 ${
                                i < badge.difficulty ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                              }`}
                              fill={i < badge.difficulty ? 'currentColor' : 'none'}
                            />
                          ))}
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Level {badge.difficulty}/5
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 shadow-inner">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                      <InformationCircleIcon className="h-5 w-5 mr-2 text-primary-500" />
                      About this Badge
                    </h2>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{badge.description}</p>
                    
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Category
                        </h3>
                        <div>
                          {badge.category && typeof badge.category === 'object' && badge.category.name ? (
                            <span 
                              className="badge-category inline-flex items-center"
                              style={{ 
                                backgroundColor: badge.category.color || 'gray',
                                color: '#ffffff',
                              }}
                            >
                              {badge.category.name}
                            </span>
                          ) : (
                            <span 
                              className="badge-category inline-flex items-center"
                              style={{ 
                                backgroundColor: 'rgb(156, 163, 175)',
                                color: '#ffffff',
                              }}
                            >
                              {typeof badge.category === 'string' ? badge.category : 'Uncategorized'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Created By
                        </h3>
                        <div className="flex items-center">
                          <UserCircleIcon className="h-5 w-5 text-gray-500 mr-2" />
                          <span className="text-gray-900 dark:text-gray-300">
                            {badge.creatorId.name || badge.creatorId.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Criteria to Earn
                      </h3>
                      <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm border-l-4 border-primary-500">
                        <p className="text-gray-700 dark:text-gray-300">{badge.criteria}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Submission Section */}
            {session?.user?.role === 'student' && (
              <div className="mt-8 px-6 py-6 sm:px-8 sm:pb-8">
                <div className="space-y-6">
                  {hasEarnedBadge ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl shadow-inner">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 dark:bg-green-800 p-3 rounded-full">
                          <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-300" />
                        </div>
                        <div className="ml-5">
                          <h3 className="text-lg font-bold text-green-800 dark:text-green-100">
                            Congratulations!
                          </h3>
                          <p className="text-green-700 dark:text-green-200 mt-1">
                            You've earned this badge. It's now part of your collection!
                          </p>
                          <div className="mt-4">
                            <button 
                              onClick={() => router.push('/portfolio')}
                              className="btn bg-green-600 hover:bg-green-700 text-white"
                            >
                              View in My Portfolio
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : hasPendingSubmission ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-2xl shadow-inner">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-800 p-3 rounded-full">
                          <ClockIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-300" />
                        </div>
                        <div className="ml-5">
                          <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-100">
                            Under Review
                          </h3>
                          <p className="text-yellow-700 dark:text-yellow-200 mt-1">
                            Your submission for this badge is currently being reviewed by a teacher.
                          </p>
                          <div className="mt-4">
                            <button 
                              onClick={() => router.push('/submissions')}
                              className="btn bg-yellow-600 hover:bg-yellow-700 text-white"
                            >
                              Check Submission Status
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-primary-50 dark:bg-primary-900/20 p-6 rounded-2xl shadow-inner">
                      <h3 className="text-2xl font-bold text-primary-800 dark:text-primary-100 mb-4 flex items-center">
                        <TrophyIcon className="h-7 w-7 mr-2 text-primary-600 dark:text-primary-300" />
                        Ready to Earn This Badge?
                      </h3>
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                        <SubmissionForm 
                          badge={{
                            ...badge,
                            category: typeof badge.category === 'object' ? (badge.category._id || '') : badge.category,
                            creatorId: typeof badge.creatorId === 'object' ? badge.creatorId._id : badge.creatorId,
                            approvedBy: typeof badge.approvedBy === 'object' ? badge.approvedBy._id : badge.approvedBy
                          }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 