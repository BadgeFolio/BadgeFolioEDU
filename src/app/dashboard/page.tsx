'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { StarIcon, UserIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

interface DashboardStats {
  totalBadges: number;
  activeStudents?: number;
  badgesEarned?: number;
  pendingReviews?: number;
  inProgress?: number;
  badgesByCategory: {
    [key: string]: {
      count: number;
      color: string;
    };
  };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalBadges: 0,
    activeStudents: 0,
    badgesEarned: 0,
    pendingReviews: 0,
    inProgress: 0,
    badgesByCategory: {}
  });
  const [suggestedBadges, setSuggestedBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryExpanded, setCategoryExpanded] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch total badges, submissions, categories, and user's submissions
        const [badgesRes, submissionsRes, categoriesRes] = await Promise.all([
          fetch('/api/badges'),
          fetch('/api/submissions'),
          fetch('/api/categories')
        ]);
        
        const [badgesData, submissionsData, categoriesData] = await Promise.all([
          badgesRes.json(),
          submissionsRes.json(),
          categoriesRes.json()
        ]);

        // Get user's submissions
        const userSubmissions = new Set(
          submissionsData
            .filter((s: any) => s.studentId && s.studentId._id === (session?.user as any)?._id)
            .map((s: any) => s.badgeId?._id)
            .filter(Boolean)
        );

        // Get suggested badges (not started by user)
        const availableBadges = badgesData
          .filter((badge: any) => badge._id && !userSubmissions.has(badge._id))
          .sort((a: any, b: any) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime())
          .slice(0, 3);

        setSuggestedBadges(availableBadges);

        // Calculate statistics
        const totalBadges = badgesData.length;
        const pendingSubmissions = submissionsData.filter((s: any) => s.status === 'pending').length;
        const earnedBadges = submissionsData.filter((s: any) => s.status === 'approved').length;
        const inProgressBadges = submissionsData.filter((s: any) => s.status === 'pending').length;

        // Initialize categories with 0 counts
        const badgesByCategory = categoriesData.reduce((acc: any, category: any) => {
          acc[category.name] = {
            count: 0,
            color: category.color
          };
          return acc;
        }, {});

        // Count badges per category
        badgesData.forEach((badge: any) => {
          const categoryName = badge.category?.name || 'Other';
          if (badgesByCategory[categoryName]) {
            badgesByCategory[categoryName].count += 1;
          } else {
            badgesByCategory[categoryName] = {
              count: 1,
              color: badge.category?.color || 'gray'
            };
          }
        });

        // Get unique students count
        const uniqueStudents = new Set(
          submissionsData
            .filter((s: any) => s.studentId && s.studentId._id)
            .map((s: any) => s.studentId._id)
        ).size;

        setStats({
          totalBadges,
          activeStudents: uniqueStudents,
          badgesEarned: earnedBadges,
          pendingReviews: pendingSubmissions,
          inProgress: inProgressBadges,
          badgesByCategory
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchDashboardStats();
    }
  }, [status]);

  useEffect(() => {
    // Check localStorage for saved preference
    const savedPreference = localStorage.getItem('categoryExpanded');
    if (savedPreference !== null) {
      setCategoryExpanded(savedPreference === 'true');
    }
  }, []);

  const toggleCategorySection = () => {
    const newState = !categoryExpanded;
    setCategoryExpanded(newState);
    // Save preference to localStorage
    localStorage.setItem('categoryExpanded', String(newState));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isTeacher = (session?.user as any)?.role === 'teacher';

  const categoryColors: { [key: string]: string } = {
    'Programming': 'from-blue-500 to-blue-600',
    'Web Development': 'from-indigo-500 to-indigo-600',
    'Data Science': 'from-purple-500 to-purple-600',
    'Design': 'from-pink-500 to-pink-600',
    'Soft Skills': 'from-yellow-500 to-yellow-600',
    'Mathematics': 'from-green-500 to-green-600',
    'Science': 'from-teal-500 to-teal-600',
    'Languages': 'from-red-500 to-red-600',
    'Other': 'from-gray-500 to-gray-600'
  };

  const getCategoryGradient = (categoryName: string) => {
    const categoryMap: Record<string, string> = {
      'Programming': 'from-primary-500 to-primary-600',
      'Computer Science': 'from-primary-600 to-primary-700',
      'Data Science': 'from-primary-400 to-primary-500',
      'Cybersecurity': 'from-primary-700 to-primary-800',
      'Mathematics': 'from-primary-500 to-primary-600',
      'Web Development': 'from-primary-400 to-primary-500',
      'Artificial Intelligence': 'from-primary-600 to-primary-700',
    };
    
    // Return the gradient for the category or a default one
    return categoryMap[categoryName] || 'from-primary-500 to-primary-600';
  };

  const displayedCategories = Object.entries(stats.badgesByCategory)
    .map(([category, { count, color }]) => ({ category, count, color }))
    .sort((a, b) => b.count - a.count)
    .slice(0, showAllCategories ? undefined : 3);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-[#59192b] dark:to-[#4a1424]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Welcome back, {session?.user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
              {isTeacher 
                ? "Let's inspire students with new badges today"
                : "Ready to earn some new badges?"}
            </p>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-800 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-100 text-sm">Total Badges</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalBadges}</p>
                </div>
                <div className="bg-primary-400/30 p-3 rounded-full">
                  <StarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-400 to-primary-500 dark:from-primary-500 dark:to-primary-700 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-50 text-sm">{isTeacher ? 'Active Students' : 'Badges Earned'}</p>
                  <p className="text-3xl font-bold mt-1">{isTeacher ? stats.activeStudents : stats.badgesEarned || 0}</p>
                </div>
                <div className="bg-primary-300/30 p-3 rounded-full">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-900 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-100 text-sm">{isTeacher ? 'Pending Reviews' : 'In Progress'}</p>
                  <p className="text-3xl font-bold mt-1">{isTeacher ? stats.pendingReviews : stats.inProgress || 0}</p>
                </div>
                <div className="bg-primary-500/30 p-3 rounded-full">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Badges by Category */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Badges by Category</h2>
              <button 
                className="flex items-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
                onClick={() => setShowAllCategories(!showAllCategories)}
              >
                <span>{showAllCategories ? 'Collapse' : 'Expand'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path 
                    fillRule="evenodd" 
                    d={showAllCategories 
                      ? "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                      : "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"} 
                    clipRule="evenodd" 
                  />
                </svg>
              </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    {displayedCategories.length} {displayedCategories.length === 1 ? 'category' : 'categories'} with a total of {stats.totalBadges} {stats.totalBadges === 1 ? 'badge' : 'badges'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {displayedCategories.map(({ category, count, color }) => (
                      <div 
                        key={category} 
                        className="flex-1 min-w-[200px]"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div 
                            className={`bg-gradient-to-r ${getCategoryGradient(category)} h-2.5 rounded-full`} 
                            style={{ width: `${Math.min(100, (count / stats.totalBadges) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-primary-600 dark:text-primary-400">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d={showAllCategories 
                        ? "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                        : "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"} 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Badges */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
              {isTeacher ? 'Recently Created Badges' : 'Suggested Badges'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedBadges.length > 0 ? suggestedBadges.map((badge: any) => (
                <div 
                  key={badge._id}
                  onClick={() => router.push(`/badges/${badge._id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                >
                  {badge.image && (
                    <div className="h-40 bg-gray-200 dark:bg-gray-700 relative">
                      <img
                        src={badge.image}
                        alt={badge.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{badge.name}</h3>
                      {badge.category && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${badge.category.color}-100 text-${badge.category.color}-800 dark:bg-${badge.category.color}-800 dark:text-${badge.category.color}-100`}>
                          {badge.category.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {badge.description && badge.description.length > 100
                        ? `${badge.description.substring(0, 100)}...`
                        : badge.description}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {isTeacher 
                      ? "You haven't created any badges yet. Create your first badge to get started!"
                      : "Congratulations! You've completed all available badges."}
                  </p>
                  {isTeacher && (
                    <button
                      onClick={() => router.push('/badges/create')}
                      className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create Badge
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 