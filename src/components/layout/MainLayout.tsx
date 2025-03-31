'use client';

import { useState, Fragment, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { 
  Bars3Icon, 
  XMarkIcon, 
  ArrowRightOnRectangleIcon, 
  UserIcon, 
  Cog6ToothIcon, 
  UserGroupIcon, 
  EnvelopeIcon, 
  BookOpenIcon,
  HomeIcon,
  AcademicCapIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ThemeToggle } from '../ThemeToggle';

// Utility function to join class names conditionally
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Redirect to sign in if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }
  
  // Redirect to change password page if password change is required
  if (status === 'authenticated' && session?.user?.requirePasswordChange) {
    console.log("User requires password change, redirecting...", session.user);
    router.push('/auth/change-password');
    return null;
  }

  const userRole = session?.user ? (session.user as any).role || 'student' : 'student';
  const isTeacher = userRole === 'teacher';

  const copyShareLink = async () => {
    try {
      if (!session?.user) {
        toast.error('You must be logged in to share your portfolio');
        return;
      }

      const userId = (session.user as any)._id;
      if (!userId) {
        toast.error('Unable to generate portfolio link');
        return;
      }

      const baseUrl = window.location.origin;
      const portfolioUrl = `${baseUrl}/portfolio/${userId}`;
      await navigator.clipboard.writeText(portfolioUrl);
      toast.success('Portfolio link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('profile-dropdown');
      const button = document.getElementById('profile-button');
      if (
        dropdown &&
        button &&
        !dropdown.contains(event.target as Node) &&
        !button.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Badges', href: '/badges', icon: TrophyIcon },
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: BookOpenIcon,
      role: ['student']
    },
    {
      name: 'Classrooms',
      href: '/classrooms',
      icon: AcademicCapIcon,
      role: ['teacher', 'student']
    },
    {
      name: 'Admin',
      href: '/admin',
      icon: Cog6ToothIcon,
      role: ['admin', 'teacher']
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  BadgeFolio
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Dashboard
                </Link>
                <Link
                  href="/badges"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Badges
                </Link>
                {!isTeacher && (
                  <Link
                    href="/portfolio"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    My Portfolio
                  </Link>
                )}
                {isTeacher && (
                  <>
                    <Link
                      href="/badges/create"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Create Badge
                    </Link>
                    <Link
                      href="/admin/portfolios"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Portfolios
                    </Link>
                  </>
                )}
                <Link
                  href="/submissions"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {session?.user && ((session.user as any).role === 'teacher' || (session.user as any).role === 'admin') ? 'Review Submissions' : 'My Submissions'}
                </Link>
                <Link
                  href="/community"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Community
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="mr-4">
                <ThemeToggle />
              </div>
              {session?.user && (
                <div className="relative">
                  <button
                    id="profile-button"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 focus:outline-none"
                  >
                    <div className="flex items-center">
                      {session.user.image && (
                        <img
                          className="h-8 w-8 rounded-full"
                          src={session.user.image}
                          alt=""
                        />
                      )}
                      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {session.user.name}
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          (session.user as any).role === 'teacher' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                          (session.user as any).role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                        }`}>
                          {(session.user as any).role || 'student'}
                        </span>
                      </span>
                    </div>
                  </button>

                  {isProfileOpen && (
                    <div
                      id="profile-dropdown"
                      className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
                    >
                      <div className="py-1">
                        <div className="px-4 py-2">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{session.user.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{session.user.email}</p>
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (session.user as any).role === 'teacher' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              (session.user as any).role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                            }`}>
                              <span className={`-ml-0.5 mr-1.5 h-2 w-2 rounded-full ${
                                (session.user as any).role === 'teacher' ? 'bg-green-400 dark:bg-green-300' :
                                (session.user as any).role === 'admin' ? 'bg-purple-400 dark:bg-purple-300' :
                                'bg-blue-400 dark:bg-blue-300'
                              }`} />
                              {(session.user as any).role || 'student'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <hr className="border-gray-200 dark:border-gray-600" />
                      <div className="py-1">
                        {((session.user as any).role === 'admin' || (session.user as any).role === 'teacher') && (
                          <>
                            <Link
                              href="/admin"
                              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => setIsProfileOpen(false)}
                            >
                              Admin Dashboard
                            </Link>
                            <Link
                              href="/submissions"
                              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => setIsProfileOpen(false)}
                            >
                              Review Submissions
                            </Link>
                            {(session.user as any).role === 'admin' && (
                              <>
                                <Link
                                  href="/admin/roles"
                                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => setIsProfileOpen(false)}
                                >
                                  Role Management
                                </Link>
                                <Link
                                  href="/admin/invitations"
                                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => setIsProfileOpen(false)}
                                >
                                  User Invitations
                                </Link>
                                <Link
                                  href="/admin/settings"
                                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => setIsProfileOpen(false)}
                                >
                                  System Settings
                                </Link>
                                <div className="border-t border-gray-100 dark:border-gray-700" />
                              </>
                            )}
                            <hr className="border-gray-200 dark:border-gray-600" />
                          </>
                        )}
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Profile Settings
                        </Link>
                        {!isTeacher && (
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={copyShareLink}
                          >
                            Share My Portfolio
                          </button>
                        )}
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => signOut()}
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Mobile menu */}
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link
                href="/dashboard"
                className="block px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Dashboard
              </Link>
              <Link
                href="/badges"
                className="block px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Badges
              </Link>
              {!isTeacher && (
                <Link
                  href="/portfolio"
                  className="block px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  My Portfolio
                </Link>
              )}
              {isTeacher && (
                <>
                  <Link
                    href="/badges/create"
                    className="block px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Create Badge
                  </Link>
                  <Link
                    href="/admin/portfolios"
                    className="block px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Portfolios
                  </Link>
                </>
              )}
              <Link
                href="/submissions"
                className="block px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {session?.user && ((session.user as any).role === 'teacher' || (session.user as any).role === 'admin') ? 'Review Submissions' : 'My Submissions'}
              </Link>
              <Link
                href="/community"
                className="block px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Community
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 