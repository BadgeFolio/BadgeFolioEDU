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
        <div className="relative bg-gradient-to-b from-white to-gray-50 dark:from-[#59192b] dark:to-[#4a1424] shadow-2xl overflow-hidden sm:rounded-3xl backdrop-blur-xl border border-white/20 dark:border-gray-700/30">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10 z-0"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-400 dark:bg-primary-600 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary-400 dark:bg-secondary-600 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10 px-6 py-6 sm:px-8 sm:pt-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-4">
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
                  {badge.category && typeof badge.category === 'object' && badge.category.name && (
                    <span 
                      className="badge-category inline-flex items-center"
                      style={{ 
                        backgroundColor: badge.category.color || 'gray',
                        color: '#ffffff',
                      }}
                    >
                      {badge.category.name}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-3">
                  {badge.name}
                </h1>
                
                {canModify && (
                  <div className="flex flex-wrap gap-4 mt-6">
                    <button
                      onClick={toggleVisibility}
                      disabled={isUpdating}
                      className="btn-glass btn-primary group"
                    >
                      {isUpdating ? 
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> : 
                        badge.isPublic ? 
                          <EyeSlashIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" /> : 
                          <EyeIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />}
                      {isUpdating ? 'Updating...' : badge.isPublic ? 'Make Private' : 'Make Public'}
                    </button>
                    <button
                      onClick={() => router.push(`/badges/edit/${params.id}`)}
                      className="btn-glass btn-secondary group"
                    >
                      <PencilIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                      Edit Badge
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="btn-glass btn-danger group"
                    >
                      {isDeleting ? 
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> :
                        <TrashIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />}
                      {isDeleting ? 'Deleting...' : 'Delete Badge'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 md:mt-12 flex flex-col md:flex-row gap-8">
              {badge.image && (
                <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                  <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-white/80 dark:border-gray-700/80 
                                 group hover:scale-[1.02] transition-all duration-500 ease-out">
                    <img
                      src={badge.image}
                      alt={badge.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity"></div>
                    
                    <div className="absolute bottom-0 left-0 w-full p-4">
                      <div className="flex items-center backdrop-blur-md bg-gray-900/50 dark:bg-black/50 rounded-xl px-4 py-2 shadow-lg">
                        {Array(5)
                          .fill(0)
                          .map((_, i) => (
                            <StarIcon
                              key={`star-${i}`}
                              className={`h-6 w-6 ${
                                i < badge.difficulty ? 'text-yellow-400 drop-shadow-glow-yellow' : 'text-gray-300 dark:text-gray-600'
                              } transition-all duration-300 hover:scale-110`}
                              fill={i < badge.difficulty ? 'currentColor' : 'none'}
                            />
                          ))}
                        <span className="ml-2 text-sm font-medium text-white drop-shadow">
                          Level {badge.difficulty}/5
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex-1">
                <div className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/40 rounded-2xl p-8 shadow-inner border border-white/50 dark:border-gray-700/50">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center group">
                    <InformationCircleIcon className="h-6 w-6 mr-2 text-primary-500 group-hover:scale-110 transition-transform" />
                    <span className="relative">
                      About this Badge
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                    </span>
                  </h2>
                  <p className="mt-2 text-gray-700 dark:text-gray-300 leading-relaxed">{badge.description}</p>
                  
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                        <span className="w-8 h-0.5 bg-primary-500 mr-2"></span>
                        Category
                      </h3>
                      <div>
                        {badge.category && typeof badge.category === 'object' && badge.category.name ? (
                          <span 
                            className="badge-category inline-flex items-center hover:scale-105 transition-transform cursor-default"
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
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                        <span className="w-8 h-0.5 bg-primary-500 mr-2"></span>
                        Created By
                      </h3>
                      <div className="flex items-center bg-white/50 dark:bg-gray-700/30 rounded-full py-2 px-4 shadow-sm border border-white/50 dark:border-gray-600/50 hover:shadow-md transition-shadow">
                        <UserCircleIcon className="h-5 w-5 text-primary-500 mr-2" />
                        <span className="text-gray-900 dark:text-gray-300 font-medium">
                          {badge.creatorId.name || badge.creatorId.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                      <span className="w-8 h-0.5 bg-primary-500 mr-2"></span>
                      Criteria to Earn
                    </h3>
                    <div className="backdrop-blur-md bg-white/60 dark:bg-gray-700/40 rounded-xl p-6 shadow-lg border-l-4 border-primary-500 hover:shadow-xl transition-shadow">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{badge.criteria}</p>
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
                  <div className="backdrop-blur-md bg-green-50/90 dark:bg-green-900/30 p-8 rounded-2xl shadow-lg border border-green-200/50 dark:border-green-700/30">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-shrink-0 bg-gradient-to-br from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 p-5 rounded-full shadow-lg">
                        <CheckCircleIcon className="h-12 w-12 text-white drop-shadow-md animate-pulse" style={{animationDuration: '3s'}} />
                      </div>
                      <div className="text-center md:text-left">
                        <h3 className="text-2xl font-bold text-green-800 dark:text-green-100 mb-2">
                          Congratulations! 🎉
                        </h3>
                        <p className="text-green-700 dark:text-green-200 text-lg mb-6">
                          You've successfully earned this badge. It's now proudly displayed in your portfolio!
                        </p>
                        <button 
                          onClick={() => router.push('/portfolio')}
                          className="btn-gradient-success text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform transition hover:scale-105 hover:-translate-y-1"
                        >
                          View in My Portfolio
                        </button>
                      </div>
                    </div>
                  </div>
                ) : hasPendingSubmission ? (
                  <div className="backdrop-blur-md bg-yellow-50/90 dark:bg-yellow-900/30 p-8 rounded-2xl shadow-lg border border-yellow-200/50 dark:border-yellow-700/30">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-shrink-0 bg-gradient-to-br from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 p-5 rounded-full shadow-lg">
                        <ClockIcon className="h-12 w-12 text-white drop-shadow-md animate-spin" style={{animationDuration: '10s'}} />
                      </div>
                      <div className="text-center md:text-left">
                        <h3 className="text-2xl font-bold text-yellow-800 dark:text-yellow-100 mb-2">
                          Under Review
                        </h3>
                        <p className="text-yellow-700 dark:text-yellow-200 text-lg mb-6">
                          Your submission is being reviewed by our educators. We'll notify you once it's approved!
                        </p>
                        <button 
                          onClick={() => router.push('/submissions')}
                          className="btn-gradient-warning text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform transition hover:scale-105 hover:-translate-y-1"
                        >
                          Check Submission Status
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="backdrop-blur-md bg-primary-50/90 dark:bg-primary-900/30 p-8 rounded-2xl shadow-lg border border-primary-200/50 dark:border-primary-700/30">
                    <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-700 to-primary-500 dark:from-primary-300 dark:to-primary-100 mb-6 flex items-center">
                      <TrophyIcon className="h-9 w-9 mr-3 text-primary-600 dark:text-primary-300 float animate-float" />
                      Ready to Earn This Badge?
                    </h3>
                    <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/40 rounded-xl p-8 shadow-xl border border-white/50 dark:border-gray-700/50 hover:shadow-2xl transition-shadow">
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
    </MainLayout>
  );
} 