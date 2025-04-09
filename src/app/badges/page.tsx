'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Badge, Submission, Category, PopulatedBadge, SimplifiedCategory } from '@/types';
import Image from 'next/image';
import { 
  CodeBracketIcon, 
  GlobeAltIcon, 
  ChartBarIcon, 
  PaintBrushIcon, 
  ChatBubbleBottomCenterTextIcon, 
  CalculatorIcon, 
  BeakerIcon, 
  LanguageIcon, 
  TagIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

export default function Badges() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [badges, setBadges] = useState<PopulatedBadge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const isTeacher = (session?.user as any)?.role === 'teacher';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [badgesRes, submissionsRes, categoriesRes] = await Promise.all([
          fetch('/api/badges'),
          !isTeacher ? fetch('/api/submissions') : Promise.resolve(null),
          fetch('/api/categories')
        ]);

        const [badgesData, categoriesData] = await Promise.all([
          badgesRes.json(),
          categoriesRes.json()
        ]);

        setBadges(Array.isArray(badgesData) ? badgesData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        if (!isTeacher && submissionsRes) {
          try {
            const submissionsData = await submissionsRes.json();
            console.log('Submissions data:', submissionsData);
            // Ensure we're setting an array even if the API returns null/undefined
            setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
          } catch (submissionError) {
            console.error('Error processing submissions:', submissionError);
            setSubmissions([]);
          }
        } else {
          // Explicitly set submissions to empty array if teacher or no response
          setSubmissions([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
        // Ensure submissions is always an array
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    } else {
      // Reset state when not authenticated
      setSubmissions([]);
      setBadges([]);
      setCategories([]);
    }
  }, [status, isTeacher]);

  const getSubmissionStatus = (badgeId: string) => {
    if (!submissions || !Array.isArray(submissions) || submissions.length === 0 || !badgeId) return undefined;
    const hasApprovedSubmission = submissions.some(s => 
      s?.badgeId && typeof s.badgeId === 'object' && '_id' in s.badgeId && s.badgeId._id === badgeId && s.status === 'approved'
    );
    if (hasApprovedSubmission) return 'approved';
    const submission = submissions.find(s => 
      s?.badgeId && typeof s.badgeId === 'object' && '_id' in s.badgeId && s.badgeId._id === badgeId
    );
    return submission?.status;
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Earned';
      case 'rejected':
        return 'Not Approved';
      default:
        return 'Not Started';
    }
  };

  const getCategoryName = (category: SimplifiedCategory): string => {
    return category.name;
  };

  const getCategoryColor = (category: SimplifiedCategory): string => {
    return category.color || 'gray';
  };

  const getCategoryIcon = (categoryName: string) => {
    const icons = {
      'Programming': CodeBracketIcon,
      'Web': GlobeAltIcon,
      'Data Science': ChartBarIcon,
      'Design': PaintBrushIcon,
      'Design Thinking': PaintBrushIcon,
      'ELA': ChatBubbleBottomCenterTextIcon,
      'Math': CalculatorIcon,
      'Science': BeakerIcon,
      'Languages': LanguageIcon,
      'Python': CodeBracketIcon,
      'Scratch': CodeBracketIcon,
      'Social Studies': GlobeAltIcon,
      'Demo': TagIcon,
    };
    
    const IconComponent = icons[categoryName as keyof typeof icons] || TagIcon;
    return <IconComponent className="w-3 h-3 mr-1" />;
  };

  const filteredBadges = badges.filter(badge => {
    if (!badge?._id || !badge?.category) return false;
    const matchesCategory = selectedCategory === 'All' || badge.category.name === selectedCategory;
    
    if (!isTeacher && Array.isArray(submissions)) {
      const submission = submissions.find(s => 
        s?.badgeId && typeof s.badgeId === 'object' && '_id' in s.badgeId && s.badgeId._id === badge._id
      );
      const status = submission?.status;
      
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Earned' && status !== 'approved') return false;
        if (selectedStatus === 'Not Started' && status) return false;
      }
    }

    return matchesCategory;
  }).sort((a, b) => {
    // Sort by creation date
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Badges</h1>
            {isTeacher && (
              <button
                onClick={() => router.push('/badges/create')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Create Badge
              </button>
            )}
          </div>

          <div className="mb-6 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            {!isTeacher && (
              <div className="flex-1">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by Status
                </label>
                <select
                  id="status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="All">All Badges</option>
                  <option value="Not Started">Not Started</option>
                  <option value="Earned">Earned</option>
                </select>
              </div>
            )}
            <div className="flex-1">
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort By Date
              </label>
              <div className="mt-1 flex items-center">
                <select
                  id="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <button 
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="ml-2 p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                  aria-label={`Sort by ${sortOrder === 'newest' ? 'oldest' : 'newest'}`}
                >
                  {sortOrder === 'newest' ? <ArrowDownIcon className="h-5 w-5" /> : <ArrowUpIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBadges.map((badge) => {
              const submissionStatus = !isTeacher ? getSubmissionStatus(badge._id) : undefined;

              return (
                <div
                  key={badge._id}
                  onClick={() => router.push(`/badges/${badge._id}`)}
                  className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer"
                >
                  <div className="p-6">
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <span 
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-sm"
                            style={{ 
                              backgroundColor: getCategoryColor(badge.category),
                              color: '#ffffff',
                              fontWeight: '500',
                            }}
                          >
                            {getCategoryIcon(getCategoryName(badge.category))}
                            {getCategoryName(badge.category)}
                          </span>
                        </div>
                        <div className="relative aspect-square">
                          <Image
                            src={badge.image || '/placeholder-badge.png'}
                            alt={badge.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover rounded-lg"
                            unoptimized={badge.image?.includes('cloudinary.com') || false}
                          />
                        </div>
                        <div className="mt-4">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{badge.name}</h3>
                          {!isTeacher && (
                            <div className="mt-1">
                              {(() => {
                                const status = getSubmissionStatus(badge._id);
                                return (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                    {getStatusText(status)}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{badge.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 