'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { PopulatedBadge } from '@/types';

interface AdminBadge extends PopulatedBadge {
  selected?: boolean;
}

// Type guard to check if creatorId is an object with email property
function isPopulatedCreator(creator: any): creator is { _id: string; name?: string; email: string } {
  return typeof creator === 'object' && creator !== null && 'email' in creator;
}

export default function AdminBadges() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [badges, setBadges] = useState<AdminBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false);
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>('all');
  const [cleanupResults, setCleanupResults] = useState<{ submissions: number; portfolios: number } | null>(null);
  const [deletingBadge, setDeletingBadge] = useState<AdminBadge | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      // Check if user is admin
      const userRole = (session?.user as any)?.role;
      if (userRole !== 'admin') {
        toast.error('Only administrators can access this page');
        router.push('/dashboard');
        return;
      }

      fetchBadges();
    }
  }, [status, session, router]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      // Construct URL with query parameters
      let url = '/api/badges';
      const params = new URLSearchParams();
      
      if (filterCreatedByMe) {
        params.append('createdByMe', 'true');
      }
      
      if (filterApprovalStatus !== 'all') {
        params.append('approvalStatus', filterApprovalStatus);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch badges');
      
      const data = await res.json();
      setBadges(data);
    } catch (error) {
      console.error('Error fetching badges:', error);
      toast.error('Failed to load badges');
      setError('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBadge = (id: string) => {
    setSelectedBadges(prev => 
      prev.includes(id) 
        ? prev.filter(badgeId => badgeId !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAllBadges = () => {
    if (selectedBadges.length === badges.length) {
      setSelectedBadges([]);
    } else {
      setSelectedBadges(badges.map(badge => badge._id));
    }
  };

  const handleDeleteBadge = async (badge: AdminBadge) => {
    setDeletingBadge(badge);
    setShowDeleteModal(true);
  };

  const confirmDeleteBadge = async () => {
    if (!deletingBadge) return;
    
    try {
      const res = await fetch(`/api/badges/${deletingBadge._id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete badge');
      
      toast.success(`Badge "${deletingBadge.name}" deleted successfully`);
      fetchBadges();
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast.error('Failed to delete badge');
    } finally {
      setShowDeleteModal(false);
      setDeletingBadge(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedBadges.length === 0) {
      toast.error('No badges selected');
      return;
    }
    
    setBulkDeleting(true);
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const res = await fetch('/api/badges/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeIds: selectedBadges }),
      });
      
      if (!res.ok) throw new Error('Failed to delete badges');
      
      const data = await res.json();
      toast.success(`${data.deletedCount} badges deleted successfully`);
      fetchBadges();
      setSelectedBadges([]);
    } catch (error) {
      console.error('Error deleting badges:', error);
      toast.error('Failed to delete badges');
    } finally {
      setShowDeleteModal(false);
      setBulkDeleting(false);
    }
  };

  const handleCleanupReferences = () => {
    setShowCleanupModal(true);
  };

  const confirmCleanupReferences = async () => {
    try {
      setCleaningUp(true);
      const res = await fetch('/api/badges/cleanup-references', {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to clean up badge references');
      
      const data = await res.json();
      setCleanupResults({
        submissions: data.submissionsRemoved,
        portfolios: data.portfolioReferencesRemoved,
      });
      toast.success('Badge references cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up badge references:', error);
      toast.error('Failed to clean up badge references');
    } finally {
      setCleaningUp(false);
    }
  };

  const handleApproveSelected = () => {
    if (selectedBadges.length === 0) {
      toast.error('No badges selected');
      return;
    }
    setApprovalAction('approve');
    setApprovalComment('');
    setShowApprovalModal(true);
  };

  const handleRejectSelected = () => {
    if (selectedBadges.length === 0) {
      toast.error('No badges selected');
      return;
    }
    setApprovalAction('reject');
    setApprovalComment('');
    setShowApprovalModal(true);
  };

  const confirmApproval = async () => {
    if (approvalAction === 'reject' && !approvalComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingApproval(true);
      const res = await fetch('/api/badges/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeIds: selectedBadges,
          status: approvalAction === 'approve' ? 'approved' : 'rejected',
          comment: approvalComment.trim() || undefined
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update badges');
      }
      
      const data = await res.json();
      toast.success(data.message);
      fetchBadges();
      setSelectedBadges([]);
    } catch (error) {
      console.error('Error updating badge approval:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update badge approval');
    } finally {
      setShowApprovalModal(false);
      setProcessingApproval(false);
    }
  };

  const filteredBadges = badges.filter(badge => 
    badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getApprovalStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
            <ClockIcon className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  if (error) {
    return (
      <MainLayout>
        <div className="p-8 flex justify-center items-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Badges</h1>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Badge Management</h1>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/badges/create')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Create Badge
              </button>
              
              <button
                onClick={handleCleanupReferences}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                <BoltIcon className="h-4 w-4 mr-1" />
                Cleanup References
              </button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search badges..."
                    className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center">
                    <input
                      id="filter-created-by-me"
                      type="checkbox"
                      checked={filterCreatedByMe}
                      onChange={() => {
                        setFilterCreatedByMe(!filterCreatedByMe);
                        // Reset approval filter when toggling created by me
                        if (!filterCreatedByMe) {
                          setFilterApprovalStatus('all');
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="filter-created-by-me" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Created by me
                    </label>
                  </div>
                  
                  <select
                    value={filterApprovalStatus}
                    onChange={(e) => setFilterApprovalStatus(e.target.value)}
                    className="block w-full md:w-auto pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Approval Statuses</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  <button
                    onClick={fetchBadges}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <FunnelIcon className="h-4 w-4 mr-1" />
                    Filter
                  </button>
                </div>
              </div>
              
              {selectedBadges.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleBulkDelete}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete Selected ({selectedBadges.length})
                  </button>
                  
                  <button
                    onClick={handleApproveSelected}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Approve Selected
                  </button>
                  
                  <button
                    onClick={handleRejectSelected}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Reject Selected
                  </button>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        checked={selectedBadges.length === badges.length && badges.length > 0}
                        onChange={handleSelectAllBadges}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Badge
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Creator
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Approved By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBadges.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No badges found
                      </td>
                    </tr>
                  ) : (
                    filteredBadges.map(badge => (
                      <tr key={badge._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            checked={selectedBadges.includes(badge._id)}
                            onChange={() => handleSelectBadge(badge._id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {badge.image && (
                              <img
                                src={badge.image}
                                alt={badge.name}
                                className="h-10 w-10 rounded-full mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{badge.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{badge.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                            {typeof badge.category === 'object' ? badge.category.name : badge.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {isPopulatedCreator(badge.creatorId) 
                            ? badge.creatorId.name || badge.creatorId.email 
                            : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(badge.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getApprovalStatusBadge(badge.approvalStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {badge.approvedBy 
                            ? (badge.approvedBy.name || badge.approvedBy.email)
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/badges/${badge._id}/edit`)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteBadge(badge)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span className="sr-only">Delete</span>
                            </button>
                            {badge.approvalStatus !== 'approved' && (
                              <button
                                onClick={() => {
                                  setSelectedBadges([badge._id]);
                                  setApprovalAction('approve');
                                  setApprovalComment('');
                                  setShowApprovalModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="Approve"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                                <span className="sr-only">Approve</span>
                              </button>
                            )}
                            {badge.approvalStatus !== 'rejected' && (
                              <button
                                onClick={() => {
                                  setSelectedBadges([badge._id]);
                                  setApprovalAction('reject');
                                  setApprovalComment('');
                                  setShowApprovalModal(true);
                                }}
                                className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300"
                                title="Reject"
                              >
                                <XCircleIcon className="h-5 w-5" />
                                <span className="sr-only">Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                      {bulkDeleting ? 'Delete Selected Badges' : 'Delete Badge'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {bulkDeleting
                          ? `Are you sure you want to delete ${selectedBadges.length} selected badges? This action cannot be undone.`
                          : `Are you sure you want to delete "${deletingBadge?.name}"? This action cannot be undone.`}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        <strong>Note:</strong> This will only delete the badge itself. To remove references to 
                        deleted badges in submissions and portfolios, use the "Cleanup References" action.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={bulkDeleting ? confirmBulkDelete : confirmDeleteBadge}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setBulkDeleting(false);
                    setDeletingBadge(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup References Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 sm:mx-0 sm:h-10 sm:w-10">
                    <BoltIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                      Cleanup Badge References
                    </h3>
                    <div className="mt-2">
                      {cleanupResults ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <p>Cleanup completed successfully:</p>
                          <ul className="list-disc list-inside mt-2">
                            <li>{cleanupResults.submissions} submission references removed</li>
                            <li>{cleanupResults.portfolios} portfolio references removed</li>
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          This will remove all references to deleted badges from submissions and portfolios.
                          This is useful after deleting badges to ensure no orphaned references remain.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {cleanupResults ? (
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => {
                      setShowCleanupModal(false);
                      setCleanupResults(null);
                    }}
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-amber-600 text-base font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={confirmCleanupReferences}
                      disabled={cleaningUp}
                    >
                      {cleaningUp ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Run Cleanup'
                      )}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setShowCleanupModal(false)}
                      disabled={cleaningUp}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                    approvalAction === 'approve' 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    {approvalAction === 'approve' 
                      ? <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" /> 
                      : <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                      {approvalAction === 'approve' ? 'Approve' : 'Reject'} Badge{selectedBadges.length > 1 ? 's' : ''}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {approvalAction === 'approve'
                          ? `Are you sure you want to approve ${selectedBadges.length > 1 ? `these ${selectedBadges.length} badges` : 'this badge'}?`
                          : `Are you sure you want to reject ${selectedBadges.length > 1 ? `these ${selectedBadges.length} badges` : 'this badge'}?`}
                      </p>
                      {approvalAction === 'reject' && (
                        <div className="mt-3">
                          <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Rejection Reason (required)
                          </label>
                          <textarea
                            id="rejection-reason"
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 sm:text-sm"
                            placeholder="Please provide a reason for rejection"
                            value={approvalComment}
                            onChange={(e) => setApprovalComment(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    approvalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                  onClick={confirmApproval}
                  disabled={processingApproval || (approvalAction === 'reject' && !approvalComment.trim())}
                >
                  {processingApproval ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    approvalAction === 'approve' ? 'Approve' : 'Reject'
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalComment('');
                  }}
                  disabled={processingApproval}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
} 