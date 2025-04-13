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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [teachers, setTeachers] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const isTeacher = (session?.user as any)?.role === 'teacher';
  const isAdmin = (session?.user as any)?.role === 'admin';
  const canModerate = isTeacher || isAdmin;

  useEffect(() => {
    if (status === 'authenticated') {
      if (canModerate) {
        fetchTeachers();
      }
    }
  }, [status, canModerate]);

  // Set initial filters once we have teachers data and current user
  useEffect(() => {
    if (canModerate && session?.user?.email && teachers.length > 0) {
      // Find current user in teachers list
      const currentTeacher = teachers.find(t => t.email === session.user?.email);
      if (currentTeacher) {
        setCurrentUserId(currentTeacher._id);
        setSelectedTeacher(currentTeacher._id);
        fetchSubmissions('pending', currentTeacher._id);
      } else {
        fetchSubmissions('pending');
      }
    } else if (status === 'authenticated') {
      fetchSubmissions(activeTab === 'all' ? '' : activeTab);
    }
  }, [teachers, session?.user?.email, status, canModerate]);

  // Fetch teachers for the filter dropdown
  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/users?role=teacher');
      if (!res.ok) throw new Error('Failed to fetch teachers');
      const data = await res.json();
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  // Add logging for submissions data
  useEffect(() => {
    console.log('Current submissions state:', submissions.map(sub => ({
      id: sub._id,
      evidence: sub.evidence,
      badgeName: typeof sub.badgeId === 'string' ? 'Badge' : sub.badgeId?.name || 'Badge',
      studentEmail: typeof sub.studentId === 'string' ? sub.studentId : sub.studentId?.email || 'Unknown'
    })));
  }, [submissions]);

  const fetchSubmissions = async (statusFilter = '', teacherId = '') => {
    try {
      setLoading(true);
      let queryParams = new URLSearchParams();
      
      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }
      
      if (teacherId) {
        queryParams.append('teacherId', teacherId);
      }
      
      const res = await fetch(`/api/submissions?${queryParams.toString()}`);
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
    const teacherEmail = typeof submission.teacherId === 'string' ? '' : submission.teacherId?.email?.toLowerCase() || '';
    const teacherName = typeof submission.teacherId === 'string' ? '' : submission.teacherId?.name?.toLowerCase() || '';
    
    return badgeName.includes(searchTerm) || 
           studentEmail.includes(searchTerm) || 
           studentName.includes(searchTerm) ||
           teacherEmail.includes(searchTerm) ||
           teacherName.includes(searchTerm);
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
    fetchSubmissions(tab === 'all' ? '' : tab, selectedTeacher);
  };

  // Handle selecting a submission
  const handleSelectSubmission = (submissionId: string) => {
    setSelectedSubmissions(prev => 
      prev.includes(submissionId) 
        ? prev.filter(id => id !== submissionId) 
        : [...prev, submissionId]
    );
  };

  // Handle selecting all submissions
  const handleSelectAllSubmissions = () => {
    if (selectedSubmissions.length === filteredSubmissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(filteredSubmissions.map(sub => sub._id));
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedSubmissions.length === 0) {
      toast.error('No submissions selected');
      return;
    }
    
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/submissions/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds: selectedSubmissions,
          status: 'approved'
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to approve submissions');
      }
      
      const data = await res.json();
      toast.success(`Successfully approved ${data.updatedCount} submissions`);
      fetchSubmissions();
      setSelectedSubmissions([]);
    } catch (error) {
      console.error('Error approving submissions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve submissions');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    if (selectedSubmissions.length === 0) {
      toast.error('No submissions selected');
      return;
    }
    
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/submissions/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds: selectedSubmissions,
          status: 'rejected',
          comment: reason
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reject submissions');
      }
      
      const data = await res.json();
      toast.success(`Successfully rejected ${data.updatedCount} submissions`);
      fetchSubmissions();
      setSelectedSubmissions([]);
    } catch (error) {
      console.error('Error rejecting submissions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject submissions');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Update teacher filter handling
  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacher(teacherId);
    // Refetch submissions with new teacher filter
    fetchSubmissions(activeTab === 'all' ? '' : activeTab, teacherId);
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
            <div className="flex-none">
              <Link
                href="/badges"
                className="action-button"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Submission
              </Link>
            </div>
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
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                      className={`tab-button ${
                        activeTab === tab
                          ? 'tab-active'
                          : 'tab-inactive hover:bg-gray-50 dark:hover:bg-gray-700'
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
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                {canModerate && (
                  <div>
                    <select
                      id="teacher-filter"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      value={selectedTeacher}
                      onChange={(e) => handleTeacherChange(e.target.value)}
                    >
                      <option value="">All Badge Publishers</option>
                      {teachers.map(teacher => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            {canModerate && filteredSubmissions.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="select-all"
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                    checked={selectedSubmissions.length > 0 && selectedSubmissions.length === filteredSubmissions.length}
                    onChange={handleSelectAllSubmissions}
                  />
                  <label htmlFor="select-all" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {selectedSubmissions.length > 0 ? `Selected ${selectedSubmissions.length}` : 'Select All'}
                  </label>
                </div>
                
                {selectedSubmissions.length > 0 && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleBulkApprove}
                      disabled={isBulkProcessing}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      <CheckIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                      Approve All Selected
                    </button>
                    <button
                      onClick={handleBulkReject}
                      disabled={isBulkProcessing}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <XMarkIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                      Reject All Selected
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
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
                className="action-button"
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
                      {canModerate && (
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`select-${submission._id}`}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                            checked={selectedSubmissions.includes(submission._id)}
                            onChange={() => handleSelectSubmission(submission._id)}
                          />
                        </div>
                      )}
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
                  <div className="mt-2 flex justify-between">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {typeof submission.badgeId === 'object' && submission.badgeId?.name ? 
                        `Badge: ${submission.badgeId.name}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {typeof submission.teacherId === 'object' && submission.teacherId?.name ? 
                        `Published by: ${submission.teacherId.name}` : ''}
                    </p>
                  </div>
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