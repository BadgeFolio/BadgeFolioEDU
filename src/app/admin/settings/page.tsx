'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';
import { 
  Cog6ToothIcon,
  ShieldCheckIcon,
  ServerIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

// Mock system settings data - in a real application, this would be fetched from an API
const mockSystemInfo = {
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  lastBackup: new Date(Date.now() - 86400000).toLocaleString(), // 1 day ago
  totalUsers: 256,
  totalBadges: 45,
  totalCategories: 8,
  totalSubmissions: 1289,
  serverUptime: '99.9%',
  nextMaintenance: new Date(Date.now() + 7 * 86400000).toLocaleString(), // 7 days from now
};

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [clearCacheLoading, setClearCacheLoading] = useState(false);
  const [runBackupLoading, setRunBackupLoading] = useState(false);
  const [inviteCodes, setInviteCodes] = useState({
    adminCode: '',
    teacherCode: ''
  });
  const [updateInviteCodesLoading, setUpdateInviteCodesLoading] = useState(false);
  
  const isSuperAdmin = session?.user?.email === SUPER_ADMIN_EMAIL;
  const isAdmin = (session?.user as any)?.role === 'admin';
  
  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const fetchInviteCodes = async () => {
    try {
      const response = await fetch('/api/admin/invite-codes');
      if (!response.ok) throw new Error('Failed to fetch invite codes');
      const data = await response.json();
      setInviteCodes({
        adminCode: data.adminCode || '',
        teacherCode: data.teacherCode || ''
      });
    } catch (error) {
      console.error('Error fetching invite codes:', error);
      toast.error('Failed to fetch invite codes');
    }
  };

  const handleUpdateInviteCodes = async () => {
    setUpdateInviteCodesLoading(true);
    try {
      const response = await fetch('/api/admin/invite-codes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminCode: inviteCodes.adminCode,
          teacherCode: inviteCodes.teacherCode
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update invite codes');
      }

      toast.success('Invite codes updated successfully');
    } catch (error) {
      console.error('Error updating invite codes:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update invite codes');
    } finally {
      setUpdateInviteCodesLoading(false);
    }
  };

  const handleClearCache = async () => {
    setClearCacheLoading(true);
    try {
      // In a real app, this would call an API endpoint to clear the cache
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
      console.error('Error clearing cache:', error);
    } finally {
      setClearCacheLoading(false);
    }
  };
  
  const handleRunBackup = async () => {
    setRunBackupLoading(true);
    try {
      // In a real app, this would call an API endpoint to run a backup
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      toast.success('Backup completed successfully');
    } catch (error) {
      toast.error('Failed to run backup');
      console.error('Error running backup:', error);
    } finally {
      setRunBackupLoading(false);
    }
  };
  
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Not authorized</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }
  
  const canAccessPage = isAdmin || isSuperAdmin;
  
  if (!canAccessPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Configure and monitor system settings
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              Back to Dashboard
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* System Information */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-500" />
                    System Information
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Overview of the system status and statistics
                  </p>
                </div>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mockSystemInfo.version}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Environment</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        mockSystemInfo.environment === 'production' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                      }`}>
                        {mockSystemInfo.environment}
                      </span>
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mockSystemInfo.totalUsers}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Badges</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mockSystemInfo.totalBadges}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Categories</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mockSystemInfo.totalCategories}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Submissions</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mockSystemInfo.totalSubmissions}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Server Uptime</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mockSystemInfo.serverUptime}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Backup</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mockSystemInfo.lastBackup}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Scheduled Maintenance</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{mockSystemInfo.nextMaintenance}</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {/* System Actions */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Cog6ToothIcon className="h-5 w-5 mr-2 text-blue-500" />
                  System Actions
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Perform maintenance tasks on the system
                </p>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-6">
                {/* Cache Management */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Cache Management</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Clear the system cache to refresh data and resolve potential issues.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={clearCacheLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    >
                      {clearCacheLoading ? (
                        <>
                          <div className="mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                          Clearing...
                        </>
                      ) : (
                        'Clear Cache'
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Backup Management */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Backup Management</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Run a manual backup of the system database and files.
                    </p>
                    <button
                      type="button"
                      onClick={handleRunBackup}
                      disabled={runBackupLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    >
                      {runBackupLoading ? (
                        <>
                          <div className="mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                          Running...
                        </>
                      ) : (
                        'Run Backup'
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Email Configuration */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Email Configuration</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Configure the email settings for system notifications.
                    </p>
                    <Link
                      href="/admin/settings/email"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                    >
                      Configure Email
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Security Settings */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Security Settings
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Configure security settings for the system
                </p>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Require administrators to use 2FA</p>
                  </div>
                  <div className="flex items-center h-6">
                    <input
                      id="2fa-required"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      defaultChecked={true}
                    />
                    <label htmlFor="2fa-required" className="sr-only">
                      Require Two-Factor Authentication
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white">Password Policy</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enforce strong password requirements</p>
                  </div>
                  <div className="flex items-center h-6">
                    <input
                      id="strong-passwords"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      defaultChecked={true}
                    />
                    <label htmlFor="strong-passwords" className="sr-only">
                      Enforce Strong Passwords
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white">Session Timeout</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Automatically log out inactive users</p>
                  </div>
                  <select
                    id="session-timeout"
                    name="session-timeout"
                    className="mt-1 block w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    defaultValue="30"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
                
                <div className="pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                  >
                    Save Security Settings
                  </button>
                </div>
              </div>
            </div>
            
            {/* System Logs */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                  System Logs
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Recent system logs and activity
                </p>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700">
                  <div className="text-xs font-mono text-gray-800 dark:text-gray-300 whitespace-pre-line">
                    {`[2023-07-14 08:45:23] INFO: System startup completed
[2023-07-14 09:12:45] INFO: User login - admin@example.com
[2023-07-14 09:15:10] INFO: New badge created - "JavaScript Mastery"
[2023-07-14 10:23:55] INFO: New user registered - student1@example.com
[2023-07-14 11:05:32] INFO: Badge submission received - ID: 83921
[2023-07-14 11:45:18] WARNING: Failed login attempt - unknown@example.com
[2023-07-14 12:30:45] INFO: Backup completed successfully
[2023-07-14 13:15:22] INFO: Category "Frontend Development" updated
[2023-07-14 14:05:38] INFO: Badge submission approved - ID: 83921
[2023-07-14 15:20:10] INFO: User profile updated - teacher@example.com
[2023-07-14 16:45:33] INFO: Daily statistics generated
[2023-07-14 17:55:12] INFO: System settings updated by admin
[2023-07-14 18:30:00] INFO: Scheduled maintenance tasks completed`}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                  >
                    View All Logs
                  </button>
                  <button
                    type="button"
                    className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                  >
                    Download Logs
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Invite Code Management
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage invite codes for admin and teacher roles
                </p>
              </div>
              <div className="px-4 py-5 sm:p-6 space-y-6">
                <div>
                  <label htmlFor="adminCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Admin Invite Code
                  </label>
                  <input
                    type="text"
                    name="adminCode"
                    id="adminCode"
                    value={inviteCodes.adminCode}
                    onChange={(e) => setInviteCodes({ ...inviteCodes, adminCode: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="teacherCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Teacher Invite Code
                  </label>
                  <input
                    type="text"
                    name="teacherCode"
                    id="teacherCode"
                    value={inviteCodes.teacherCode}
                    onChange={(e) => setInviteCodes({ ...inviteCodes, teacherCode: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleUpdateInviteCodes}
                    disabled={updateInviteCodesLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                  >
                    {updateInviteCodesLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      'Update Invite Codes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 