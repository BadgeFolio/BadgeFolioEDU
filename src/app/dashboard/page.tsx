'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';

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
            .filter((s: any) => s.studentId._id === (session?.user as any)?._id)
            .map((s: any) => s.badgeId._id)
        );

        // Get suggested badges (not started by user)
        const availableBadges = badgesData
          .filter((badge: any) => !userSubmissions.has(badge._id))
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
        const uniqueStudents = new Set(submissionsData.map((s: any) => s.studentId._id)).size;

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

  const getCategoryGradient = (color: string) => {
    switch (color.toLowerCase()) {
      case '#3b82f6':
      case 'blue':
        return 'from-blue-500 to-blue-600';
      case '#6366f1':
      case 'indigo':
        return 'from-indigo-500 to-indigo-600';
      case '#8b5cf6':
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case '#ec4899':
      case 'pink':
        return 'from-pink-500 to-pink-600';
      case '#eab308':
      case 'yellow':
        return 'from-amber-600 to-amber-700';
      case '#22c55e':
      case 'green':
        return 'from-green-500 to-green-600';
      case '#14b8a6':
      case 'teal':
        return 'from-teal-500 to-teal-600';
      case '#ef4444':
      case 'red':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-900">
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
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-800 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Badges</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalBadges}</p>
                </div>
                <div className="bg-blue-400/30 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-800 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">{isTeacher ? 'Active Students' : 'Badges Earned'}</p>
                  <p className="text-3xl font-bold mt-1">{isTeacher ? stats.activeStudents : stats.badgesEarned || 0}</p>
                </div>
                <div className="bg-green-400/30 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-800 rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">{isTeacher ? 'Pending Reviews' : 'In Progress'}</p>
                  <p className="text-3xl font-bold mt-1">{isTeacher ? stats.pendingReviews : stats.inProgress || 0}</p>
                </div>
                <div className="bg-purple-400/30 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Badges by Category */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Badges by Category</h2>
              <button 
                onClick={toggleCategorySection}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
              >
                {categoryExpanded ? (
                  <>
                    <span>Collapse</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Expand</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {categoryExpanded ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(stats.badgesByCategory).map(([category, { count, color }]) => (
                  <div 
                    key={category}
                    onClick={() => router.push(`/badges?category=${category}`)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{category}</h3>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${color}-100 text-${color}-800 dark:bg-${color}-800 dark:text-${color}-100`}>
                        {count} Badge{count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className={`bg-gradient-to-r ${getCategoryGradient(color)} h-2.5 rounded-full`} 
                          style={{ width: `${Math.min(100, (count / stats.totalBadges) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md cursor-pointer"
                onClick={toggleCategorySection}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      {Object.keys(stats.badgesByCategory).length} categories with a total of {stats.totalBadges} badges
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(stats.badgesByCategory)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 3)
                        .map(([category, { count, color }]) => (
                          <span 
                            key={category}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: color,
                              color: '#ffffff'
                            }}
                          >
                            {category}: {count}
                          </span>
                        ))}
                      {Object.keys(stats.badgesByCategory).length > 3 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          +{Object.keys(stats.badgesByCategory).length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
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