'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Submission } from '@/types';
import MainLayout from '@/components/layout/MainLayout';
import { Tab } from '@headlessui/react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  UserCircleIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon as SearchIcon,
  PlusIcon,
  ExclamationCircleIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

type TabType = 'all' | 'pending' | 'approved' | 'rejected';

export default function SubmissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const isTeacher = (session?.user as any)?.role === 'teacher';

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSubmissions(activeTab === 'all' ? '' : activeTab);
    }
  }, [activeTab, status]);

  // Add logging for submissions data
  useEffect(() => {
    console.log('Current submissions state:', submissions.map(sub => ({
      id: sub._id,
      evidence: sub.evidence,
      badgeName: typeof sub.badgeId === 'string' ? 'Badge' : sub.badgeId?.name || 'Badge',
      studentEmail: typeof sub.studentId === 'string' ? sub.studentId : sub.studentId?.email || 'Unknown'
    })));
  }, [submissions]);

  const fetchSubmissions = async (statusFilter = '') => {
    try {
      setLoading(true);
      const queryParam = statusFilter ? `status=${statusFilter}` : '';
      const res = await fetch(`/api/submissions?${queryParam}`);
      if (!res.ok) throw new Error('Failed to fetch submissions');
      const data = await res.json();
      console.log('Fetched submissions:', JSON.stringify(data, null, 2));
      setSubmissions(data || []);
      setError(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch submissions');
      setSubmissions([]);
      setError(error instanceof Error ? error : new Error('An unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100';
      default:
        return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100';
    }
  };

  const handleStatusChange = async (submissionId: string, newStatus: 'approved' | 'rejected', comment?: string) => {
    if (newStatus === 'rejected' && !comment?.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, comment: comment?.trim() }),
      });

      if (!res.ok) throw new Error('Failed to update submission');

      toast.success(`Submission ${newStatus}`);
      fetchSubmissions();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update submission');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Add a function to sort submissions by date
  const sortSubmissions = (subs: Submission[]) => {
    return [...subs].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  // Update the filtering and sorting logic
  const filteredSubmissions = sortSubmissions(submissions.filter(submission => {
    const searchTerm = searchQuery.toLowerCase();
    const badgeName = typeof submission.badgeId === 'string' ? '' : submission.badgeId?.name?.toLowerCase() || '';
    const studentEmail = typeof submission.studentId === 'string' ? '' : submission.studentId?.email?.toLowerCase() || '';
    const studentName = typeof submission.studentId === 'string' ? '' : submission.studentId?.name?.toLowerCase() || '';
    
    return badgeName.includes(searchTerm) || 
           studentEmail.includes(searchTerm) || 
           studentName.includes(searchTerm);
  }));

  const handleCleanup = async () => {
    if (!confirm('This will remove all old submissions that have the old evidence format. This action cannot be undone. Are you sure you want to continue?')) {
      return;
    }

    try {
      const res = await fetch('/api/submissions/cleanup', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to clean up submissions');
      }

      const data = await res.json();
      toast.success(data.message);
      fetchSubmissions();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to clean up submissions');
    }
  };

  // Update tab click handler to change both the active tab and fetch submissions
  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    fetchSubmissions(tab === 'all' ? '' : tab);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Submissions</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track and manage your badge submissions
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              href="/badges"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              New Submission
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700 mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="Search submissions"
                  />
                </div>
              </div>
              <div className="flex space-x-3 items-center">
                <div className="flex space-x-1">
                  {['all', 'pending', 'approved', 'rejected'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabClick(tab as TabType)}
                      className={`px-3 py-2 font-medium text-sm rounded-md ${
                        activeTab === tab
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="w-36">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  Failed to load submissions. Please try again later.
                </p>
              </div>
            </div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
            <ClipboardDocumentIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No submissions found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {activeTab !== 'all' || searchQuery
                ? "No submissions match your current filters."
                : "You haven't submitted any badges yet."}
            </p>
            <div className="mt-6">
              <Link
                href="/badges"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Submit a Badge
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubmissions.map((submission) => (
              <div
                key={submission._id}
                className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 truncate">
                        {typeof submission.badgeId === 'object' && submission.badgeId?.name ? 
                          submission.badgeId.name : 'Badge'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(submission.createdAt)}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
                          submission.status
                        )}`}
                      >
                        {submission.status === 'pending' && <ClockIcon className="-ml-0.5 mr-1.5 h-3 w-3" />}
                        {submission.status === 'approved' && <CheckIcon className="-ml-0.5 mr-1.5 h-3 w-3" />}
                        {submission.status === 'rejected' && <XMarkIcon className="-ml-0.5 mr-1.5 h-3 w-3" />}
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {typeof submission.badgeId === 'object' && submission.badgeId?.name ? 
                      `Badge: ${submission.badgeId.name}` : ''}
                  </p>
                </div>
                <div className="px-4 py-4 sm:px-6 space-y-2">
                  {submission.evidence && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">Evidence</h4>
                      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded-md max-h-28 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: submission.evidence }} />
                      </div>
                    </div>
                  )}
                  
                  {submission.comments && submission.comments.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">Feedback</h4>
                      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {submission.comments[0].content}
                      </div>
                    </div>
                  )}
                  
                  {isTeacher && submission.status === 'pending' && (
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={() => handleStatusChange(submission._id, 'approved')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <CheckIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for rejection:');
                          if (reason) {
                            handleStatusChange(submission._id, 'rejected', reason);
                          }
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <XMarkIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
} 