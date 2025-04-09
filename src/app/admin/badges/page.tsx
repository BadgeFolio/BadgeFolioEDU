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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { PopulatedBadge } from '@/types';

interface AdminBadge extends PopulatedBadge {
  selected?: boolean;
}

// Type guard to check if creatorId is an object with name property
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
      const res = await fetch('/api/badges');
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

  const filteredBadges = badges.filter(badge => 
    badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Badge
              </button>
              
              <button
                onClick={handleBulkDelete}
                disabled={selectedBadges.length === 0}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  selectedBadges.length === 0 
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                }`}
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                Delete Selected ({selectedBadges.length})
              </button>
              
              <button
                onClick={handleCleanupReferences}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                <BoltIcon className="h-5 w-5 mr-2" />
                Cleanup References
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search badges..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="select-all"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    checked={selectedBadges.length === badges.length && badges.length > 0}
                    onChange={handleSelectAllBadges}
                  />
                  <label htmlFor="select-all" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Select All
                  </label>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <span className="sr-only">Select</span>
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBadges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No badges found
                      </td>
                    </tr>
                  ) : (
                    filteredBadges.map((badge) => (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/badges/${badge._id}/edit`)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <PencilIcon className="h-5 w-5" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteBadge(badge)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <TrashIcon className="h-5 w-5" />
                              <span className="sr-only">Delete</span>
                            </button>
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
    </MainLayout>
  );
} 