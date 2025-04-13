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
  ArrowDownIcon,
  PlusIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  LockOpenIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

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
      <div className="max-w-7xl mx-auto">
        <div>
          <div className="flex justify-between items-center mb-8">
            <h1 className="page-heading">My Badges Collection</h1>
            {isTeacher && (
              <button
                onClick={() => router.push('/badges/create')}
                className="interactive-btn"
              >
                <PlusIcon className="h-5 w-5 mr-2 inline" />
                Create New Badge
              </button>
            )}
          </div>

          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="col-span-1">
              <label htmlFor="category" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Filter by Category
              </label>
              <div className="relative">
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input appearance-none pr-10"
                >
                  <option value="All">All Categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                  <ChevronDownIcon className="h-5 w-5" />
                </div>
              </div>
            </div>
            {!isTeacher && (
              <div className="col-span-1">
                <label htmlFor="status" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Status
                </label>
                <div className="relative">
                  <select
                    id="status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="input appearance-none pr-10"
                  >
                    <option value="All">All Badges</option>
                    <option value="Not Started">Not Started</option>
                    <option value="Earned">Earned</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <ChevronDownIcon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            )}
            <div className="col-span-1">
              <label htmlFor="sortOrder" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Sort By Date
              </label>
              <div className="flex items-center">
                <div className="relative flex-1">
                  <select
                    id="sortOrder"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="input appearance-none pr-10"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <ChevronDownIcon className="h-5 w-5" />
                  </div>
                </div>
                <button 
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="ml-2 p-2 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:hover:bg-primary-800 transition-colors"
                  aria-label={`Sort by ${sortOrder === 'newest' ? 'oldest' : 'newest'}`}
                >
                  {sortOrder === 'newest' ? <ArrowDownIcon className="h-5 w-5" /> : <ArrowUpIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBadges.map((badge) => {
              const submissionStatus = !isTeacher ? getSubmissionStatus(badge._id) : undefined;

              return (
                <motion.div
                  key={badge._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => router.push(`/badges/${badge._id}`)}
                  className="badge-card"
                >
                  <div className="p-6">
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-6">
                          <span 
                            className="badge-category"
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
                        <div className="relative aspect-square mb-6 overflow-hidden rounded-xl shadow-lg transform transition-transform hover:scale-105">
                          <Image
                            src={badge.image || '/placeholder-badge.png'}
                            alt={badge.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover hover:scale-110 transition-transform duration-500"
                            unoptimized={badge.image?.includes('cloudinary.com') || false}
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{badge.name}</h3>
                          {!isTeacher && (
                            <div className="mt-2 mb-4">
                              {(() => {
                                const status = getSubmissionStatus(badge._id);
                                return (
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                    {status === 'approved' && <CheckCircleIcon className="mr-1 h-4 w-4" />}
                                    {status === 'pending' && <ClockIcon className="mr-1 h-4 w-4" />}
                                    {status === 'rejected' && <XCircleIcon className="mr-1 h-4 w-4" />}
                                    {!status && <LockOpenIcon className="mr-1 h-4 w-4" />}
                                    {getStatusText(status)}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">{badge.description}</p>
                          <div className="mt-4 flex justify-between items-center">
                            <div className="flex">
                              {Array(5)
                                .fill(0)
                                .map((_, i) => (
                                  <StarIcon
                                    key={i}
                                    className={`h-5 w-5 ${
                                      i < badge.difficulty ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                    fill={i < badge.difficulty ? 'currentColor' : 'none'}
                                  />
                                ))}
                            </div>
                            <button className="btn btn-primary px-4 py-2 text-xs">
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 