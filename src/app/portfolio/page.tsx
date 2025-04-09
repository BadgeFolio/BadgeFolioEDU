'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import toast from 'react-hot-toast';
import { PopulatedBadge, Submission } from '@/types';
import { ShareIcon, AdjustmentsHorizontalIcon, SwatchIcon, EyeIcon, EyeSlashIcon, LinkIcon } from '@heroicons/react/24/outline';

interface Badge {
  _id: string;
  name: string;
  description: string;
  category: {
    name: string;
    color: string;
  };
  image: string;
}

interface BadgeSubmission {
  _id: string;
  badgeId: string;
  links: string[];
  updatedAt: string;
  isVisible: boolean;
  showEvidence: boolean;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface EarnedBadge {
  _id: string;
  badge: Badge;
  submission: BadgeSubmission;
  earnedDate: string;
  isVisible: boolean;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'category';
type ThemeOption = 'default' | 'minimal' | 'compact' | 'grid';

export default function Portfolio() {
  const { data: session } = useSession();
  const router = useRouter();
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [theme, setTheme] = useState<ThemeOption>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    fetchEarnedBadges();
  }, [session, router]);

  const fetchEarnedBadges = async () => {
    try {
      setLoading(true);
      const [submissionsRes, badgesRes] = await Promise.all([
        fetch('/api/submissions?status=approved'),
        fetch('/api/badges')
      ]);

      if (!submissionsRes.ok || !badgesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [submissions, badges] = await Promise.all([
        submissionsRes.json(),
        badgesRes.json()
      ]);

      // Extract unique categories from badges
      const uniqueCategories = Array.from(new Set(badges.map((b: Badge) => b.category.name)));
      setCategories(['All', ...uniqueCategories.filter((c): c is string => typeof c === 'string')]);

      // Match submissions with badge details
      const earned = submissions
        .filter((sub: BadgeSubmission) => sub.status === 'approved')
        .map((sub: BadgeSubmission) => ({
          _id: sub._id,
          badge: sub.badgeId,
          submission: sub,
          earnedDate: new Date(sub.updatedAt).toLocaleDateString(),
          isVisible: sub.isVisible ?? true
        }))
        .filter((item: EarnedBadge) => item.badge);

      setEarnedBadges(earned);
      
      // Set share URL
      if (session?.user?._id) {
        setShareUrl(`${window.location.origin}/portfolio/${session.user._id}`);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePortfolio = () => {
    if (session?.user) {
      const portfolioUrl = `${window.location.origin}/portfolio/${session.user._id}`;
      navigator.clipboard.writeText(portfolioUrl)
        .then(() => {
          toast.success('Portfolio link copied to clipboard!');
          console.log('Copied portfolio URL:', portfolioUrl);
        })
        .catch(err => {
          console.error('Failed to copy portfolio link:', err);
          toast.error('Failed to copy portfolio link');
        });
    }
  };

  const toggleBadgeVisibility = async (badgeId: string, currentVisibility: boolean) => {
    try {
      setIsUpdating(badgeId);
      const response = await fetch('/api/portfolio/visibility', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          badgeId,
          isVisible: !currentVisibility,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update badge visibility');
      }

      // Update local state
      setEarnedBadges(prevBadges =>
        prevBadges.map(badge =>
          badge._id === badgeId
            ? { ...badge, isVisible: !currentVisibility }
            : badge
        )
      );

      toast.success('Badge visibility updated successfully');
    } catch (error) {
      console.error('Error toggling badge visibility:', error);
      toast.error('Failed to update badge visibility');
    } finally {
      setIsUpdating(null);
    }
  };

  const toggleEvidenceVisibility = async (badgeId: string, currentVisibility: boolean) => {
    try {
      setIsUpdating(badgeId);
      const response = await fetch('/api/portfolio/visibility', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          badgeId,
          showEvidence: !currentVisibility,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update evidence visibility');
      }

      // Update local state
      setEarnedBadges(prevBadges =>
        prevBadges.map(badge =>
          badge._id === badgeId
            ? { ...badge, submission: { ...badge.submission, showEvidence: !currentVisibility } }
            : badge
        )
      );

      toast.success('Evidence visibility updated successfully');
    } catch (error) {
      console.error('Error toggling evidence visibility:', error);
      toast.error('Failed to update evidence visibility');
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredAndSortedBadges = earnedBadges
    .filter((badgeData) => {
      const matchesCategory = selectedCategory === 'All' || badgeData.badge.category.name === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        badgeData.badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        badgeData.badge.description.toLowerCase().includes(searchQuery.toLowerCase());
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
        return 'bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-lg transition-shadow duration-200';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Your Badge Portfolio
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Showcase your earned badges and achievements
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleSharePortfolio}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Share Portfolio
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="Search badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="category">By Category</option>
              </select>
            </div>
            <div className="min-w-[50px]">
              <button
                onClick={() => setTheme(theme === 'default' ? 'grid' : theme === 'grid' ? 'compact' : theme === 'compact' ? 'minimal' : 'default')}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                title="Change layout"
              >
                <AdjustmentsHorizontalIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {filteredAndSortedBadges.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow">
            <SwatchIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No badges found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || selectedCategory !== 'All' ? 
                "Try adjusting your filters to see more badges." : 
                "You haven't earned any badges yet. Complete badge requirements to build your portfolio."}
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/badges')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Find badges to earn
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid ${getThemeClasses()}`}>
            {filteredAndSortedBadges.map((badgeData) => (
              <div
                key={badgeData._id}
                className={getBadgeCardClasses()}
              >
                <div className="flex items-start justify-between">
                  {badgeData.badge.image && (
                    <img
                      src={badgeData.badge.image}
                      alt={badgeData.badge.name}
                      className={theme === 'compact' ? "w-12 h-12 object-cover rounded-md" : theme === 'grid' ? "w-full h-40 object-cover" : "w-16 h-16 object-cover rounded-lg"}
                    />
                  )}
                  <div className="flex-1 ml-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className={`font-semibold text-gray-900 dark:text-gray-100 ${theme === 'compact' ? 'text-sm' : 'text-lg'}`}>
                          {badgeData.badge.name}
                        </h2>
                        {theme !== 'compact' && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Earned on {badgeData.earnedDate}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-4">
                        <button
                          onClick={() => toggleBadgeVisibility(badgeData._id, badgeData.isVisible)}
                          disabled={isUpdating === badgeData._id}
                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title={badgeData.isVisible ? "Hide badge from portfolio" : "Show badge in portfolio"}
                        >
                          {badgeData.isVisible ? (
                            <EyeIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {badgeData.isVisible ? "Badge visible" : "Badge hidden"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <button
                        onClick={() => toggleEvidenceVisibility(badgeData._id, badgeData.submission.showEvidence)}
                        disabled={isUpdating === badgeData._id}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={badgeData.submission.showEvidence ? "Hide evidence from portfolio" : "Show evidence in portfolio"}
                      >
                        {badgeData.submission.showEvidence ? (
                          <EyeIcon className="h-5 w-5 text-blue-500" />
                        ) : (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {badgeData.submission.showEvidence ? "Evidence visible" : "Evidence hidden"}
                      </span>
                    </div>
                    {theme !== 'compact' && theme !== 'grid' && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {badgeData.badge.description.length > 100
                          ? `${badgeData.badge.description.substring(0, 100)}...`
                          : badgeData.badge.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${badgeData.badge.category.color}-100 text-${badgeData.badge.category.color}-800 dark:bg-${badgeData.badge.category.color}-800 dark:text-${badgeData.badge.category.color}-100`}
                      >
                        {badgeData.badge.category.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
} 