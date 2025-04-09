'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';
import { 
  UserGroupIcon, 
  TagIcon, 
  AcademicCapIcon, 
  EnvelopeIcon,
  KeyIcon,
  Cog6ToothIcon,
  UserIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
}

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const isSuperAdmin = session?.user?.email === SUPER_ADMIN_EMAIL;
  const isAdmin = (session?.user as any)?.role === 'admin';
  const isTeacher = (session?.user as any)?.role === 'teacher';
  const isStudent = (session?.user as any)?.role === 'student';

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }

    if (isSuperAdmin) {
      fetchUsers();
    }

    setIsLoading(false);
  }, [session, status, router, isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/role');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const updateRole = async (email: string, newRole: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to update role');
      }

      toast.success('Role updated successfully!');
      
      // Force a session refresh
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to update role');
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Not authorized</h1>
          <p className="mt-2 text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  if (isStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Students cannot access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isTeacher && "Manage user roles and view system settings"}
              {isAdmin && "Full access to user management and category settings"}
              {isSuperAdmin && "Complete control over all system settings"}
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">User Management</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/roles"
                className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-4 ring-white dark:ring-gray-800">
                    <UserGroupIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Role Management
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Manage user roles and permissions
                  </p>
                </div>
                <span
                  className="pointer-events-none absolute top-6 right-6 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500"
                  aria-hidden="true"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </Link>

              <Link
                href="/admin/settings"
                className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 ring-4 ring-white dark:ring-gray-800">
                    <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <span className="absolute inset-0" aria-hidden="true" />
                    System Settings
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Configure application settings
                  </p>
                </div>
                <span
                  className="pointer-events-none absolute top-6 right-6 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500"
                  aria-hidden="true"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Content Management</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/badges"
                className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 ring-4 ring-white dark:ring-gray-800">
                    <AcademicCapIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Badge Management
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Create, edit, delete badges and clean up references
                  </p>
                </div>
                <span
                  className="pointer-events-none absolute top-6 right-6 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500"
                  aria-hidden="true"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </Link>

              <Link
                href="/admin/categories"
                className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 ring-4 ring-white dark:ring-gray-800">
                    <TagIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Categories
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Manage badge categories and colors
                  </p>
                </div>
                <span
                  className="pointer-events-none absolute top-6 right-6 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500"
                  aria-hidden="true"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </Link>

              <Link
                href="/admin/portfolios"
                className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 ring-4 ring-white dark:ring-gray-800">
                    <AcademicCapIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Portfolios
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {isTeacher && "View all students' badge portfolios"}
                    {(isAdmin || isSuperAdmin) && "View all student and teacher portfolios"}
                  </p>
                </div>
                <span
                  className="pointer-events-none absolute top-6 right-6 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500"
                  aria-hidden="true"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </Link>

              {(isAdmin || isSuperAdmin) && (
                <Link
                  href="/admin/password-reset"
                  className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 ring-4 ring-white dark:ring-gray-800">
                      <KeyIcon className="h-6 w-6" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      <span className="absolute inset-0" aria-hidden="true" />
                      Password Management
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Reset passwords and manage account security
                    </p>
                  </div>
                  <span
                    className="pointer-events-none absolute top-6 right-6 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500"
                    aria-hidden="true"
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                    </svg>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 