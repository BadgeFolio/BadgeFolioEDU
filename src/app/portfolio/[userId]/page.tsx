'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import toast from 'react-hot-toast';
import { PopulatedBadge, Submission, User } from '@/types';
import { AdjustmentsHorizontalIcon, SwatchIcon } from '@heroicons/react/24/outline';

interface EarnedBadge {
  badge: PopulatedBadge;
  submission: Submission;
  earnedDate: string;
  isVisible: boolean;
  showEvidence: boolean;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'category';
type ThemeOption = 'default' | 'minimal' | 'compact' | 'grid';

export default function PublicPortfolio({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [theme, setTheme] = useState<ThemeOption>('default');
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setLoading(true);
        const [userResponse, submissionsResponse, badgesResponse] = await Promise.all([
          fetch(`/api/users/${params.userId}`),
          fetch(`/api/submissions?userId=${params.userId}&status=approved`),
          fetch('/api/badges')
        ]);

        if (!userResponse.ok || !submissionsResponse.ok || !badgesResponse.ok) {
          throw new Error('Failed to fetch portfolio data');
        }

        const userData = await userResponse.json();
        const submissions = await submissionsResponse.json();
        const badges = await badgesResponse.json();

        setUser(userData);

        const earnedBadgesData = submissions
          .map((sub: Submission) => ({
            badge: badges.find((b: PopulatedBadge) => b._id === sub.badgeId._id),
            submission: sub,
            earnedDate: new Date(sub.updatedAt).toLocaleDateString(),
            isVisible: sub.isVisible ?? true,
            showEvidence: sub.showEvidence ?? true
          }))
          .filter((item: EarnedBadge) => item.badge && item.isVisible); // Only include visible badges

        setEarnedBadges(earnedBadgesData);

        // Extract unique categories from badges
        const uniqueCategories = Array.from(new Set(badges.map((b: PopulatedBadge) => b.category.name)));
        setCategories(['All', ...uniqueCategories.filter((c): c is string => typeof c === 'string')]);
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        setError('Failed to load portfolio');
        router.push('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [params.userId, router]);

  const filteredAndSortedBadges = earnedBadges
    .filter(({ badge }) => {
      const matchesCategory = selectedCategory === 'All' || badge.category.name === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        badge.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submission.updatedAt).getTime() - new Date(a.submission.updatedAt).getTime();
        case 'oldest':
          return new Date(a.submission.updatedAt).getTime() - new Date(b.submission.updatedAt).getTime();
        case 'alphabetical':
          return a.badge.name.localeCompare(b.badge.name);
        case 'category':
          return a.badge.category.name.localeCompare(b.badge.category.name);
        default:
          return 0;
      }
    });

  const getThemeClasses = () => {
    switch (theme) {
      case 'minimal':
        return 'grid-cols-1 gap-4';
      case 'compact':
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4';
      case 'grid':
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6';
      default:
        return 'grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  const getBadgeCardClasses = () => {
    switch (theme) {
      case 'minimal':
        return 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200';
      case 'compact':
        return 'bg-white dark:bg-gray-800 p-3 rounded-md shadow hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1';
      case 'grid':
        return 'bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-lg hover:ring-2 hover:ring-blue-500 transition-all duration-200';
      default:
        return 'bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Not Found</h1>
          <p className="mt-2 text-gray-600">This portfolio does not exist or has been removed.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <div className="flex items-center">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-16 w-16 rounded-full mr-4"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{user.name}'s Portfolio</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {earnedBadges.length} Badge{earnedBadges.length !== 1 ? 's' : ''} Earned
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search badges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="category">By Category</option>
                </select>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ThemeOption)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="default">Default Theme</option>
                  <option value="minimal">Minimal</option>
                  <option value="compact">Compact</option>
                  <option value="grid">Grid</option>
                </select>
              </div>
            </div>
          </div>

          {filteredAndSortedBadges.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || selectedCategory !== 'All' 
                  ? 'No badges match your filters.'
                  : 'No badges earned yet.'}
              </p>
            </div>
          ) : (
            <div className={`grid ${getThemeClasses()}`}>
              {filteredAndSortedBadges.map(({ badge, submission, earnedDate }) => (
                <div key={badge._id} className={getBadgeCardClasses()}>
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      {badge.image ? (
                        <img
                          src={badge.image}
                          alt={badge.name}
                          className="h-16 w-16 rounded-full"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                      )}
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{badge.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Earned on {earnedDate}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Description</h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{badge.description}</p>
                    </div>

                    {submission.evidence && submission.showEvidence && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Evidence</h4>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                          <div dangerouslySetInnerHTML={{ __html: submission.evidence }} />
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${badge.category.color}-100 text-${badge.category.color}-800 dark:bg-${badge.category.color}-800 dark:text-${badge.category.color}-100`}>
                        {badge.category.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 