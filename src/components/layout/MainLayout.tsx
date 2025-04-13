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
  TrophyIcon,
  UsersIcon,
  TagIcon,
  StarIcon,
  PlusIcon,
  FolderIcon,
  ClipboardDocumentCheckIcon,
  ShareIcon
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const isAdmin = userRole === 'admin';

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
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#59192b]">
      <nav className="bg-white dark:bg-[#4a1424] shadow-xl rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-2xl font-bold text-red-600 dark:text-red-400 hover-wiggle">
                  <span className="bg-transparent dark:bg-transparent p-2 rounded-xl shadow-lg inline-block">Badge</span>
                  <span className="bg-primary-500 text-white p-2 rounded-xl shadow-lg inline-block ml-1">Folio</span>
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover-scale rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <HomeIcon className="mr-2 h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/badges"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover-scale rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <TrophyIcon className="mr-2 h-5 w-5" />
                  Badges
                </Link>
                {!isTeacher && (
                  <Link
                    href="/portfolio"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover-scale rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <BookOpenIcon className="mr-2 h-5 w-5" />
                    My Portfolio
                  </Link>
                )}
                {(isTeacher || isAdmin) && (
                  <>
                    <Link
                      href="/badges/create"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover-scale rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <PlusIcon className="mr-2 h-5 w-5" />
                      Create Badge
                    </Link>
                    <Link
                      href="/admin/portfolios"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover-scale rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <FolderIcon className="mr-2 h-5 w-5" />
                      Portfolios
                    </Link>
                  </>
                )}
                <Link
                  href="/submissions"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover-scale rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ClipboardDocumentCheckIcon className="mr-2 h-5 w-5" />
                  {session?.user && ((session.user as any).role === 'teacher' || (session.user as any).role === 'admin') ? 'Review Submissions' : 'My Submissions'}
                </Link>
                <Link
                  href="/community"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover-scale rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <UsersIcon className="mr-2 h-5 w-5" />
                  Community
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="mr-4">
                <ThemeToggle />
              </div>
              <div className="sm:hidden">
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                >
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="h-6 w-6" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" />
                  )}
                </button>
              </div>
              {session?.user && (
                <div className="relative">
                  <button
                    id="profile-button"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 focus:outline-none hover-scale"
                  >
                    <div className="flex items-center">
                      {session.user.image && (
                        <img
                          className="h-10 w-10 rounded-full border-2 border-primary-500"
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
                      className="absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden transform origin-top-right transition-all duration-200"
                    >
                      <div className="py-3 px-4 bg-primary-500 dark:bg-primary-700 text-white">
                        <p className="text-sm font-bold">{session.user.name}</p>
                        <p className="text-xs opacity-80">{session.user.email}</p>
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
                      <div className="py-2">
                        {((session.user as any).role === 'admin' || (session.user as any).role === 'teacher') && (
                          <>
                            <Link
                              href="/admin"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => setIsProfileOpen(false)}
                            >
                              <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-500" />
                              Admin Dashboard
                            </Link>
                            <Link
                              href="/submissions"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => setIsProfileOpen(false)}
                            >
                              <ClipboardDocumentCheckIcon className="mr-3 h-5 w-5 text-gray-500" />
                              Review Submissions
                            </Link>
                            {(session.user as any).role === 'admin' && (
                              <>
                                <Link
                                  href="/admin/users"
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => setIsProfileOpen(false)}
                                >
                                  <UsersIcon className="mr-3 h-5 w-5 text-gray-500" />
                                  User Management
                                </Link>
                                <Link
                                  href="/admin/badges"
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => setIsProfileOpen(false)}
                                >
                                  <StarIcon className="mr-3 h-5 w-5 text-gray-500" />
                                  Badge Management
                                </Link>
                                <Link
                                  href="/admin/categories"
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => setIsProfileOpen(false)}
                                >
                                  <TagIcon className="mr-3 h-5 w-5 text-gray-500" />
                                  Category Management
                                </Link>
                              </>
                            )}
                            {(session.user as any).role === 'teacher' && (
                              <Link
                                href="/admin/categories"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setIsProfileOpen(false)}
                              >
                                <TagIcon className="mr-3 h-5 w-5 text-gray-500" />
                                Manage Categories
                              </Link>
                            )}
                            <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
                          </>
                        )}
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <UserIcon className="mr-3 h-5 w-5 text-gray-500" />
                          Profile Settings
                        </Link>
                        {!isTeacher && (
                          <button
                            className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={copyShareLink}
                          >
                            <ShareIcon className="mr-3 h-5 w-5 text-gray-500" />
                            Share My Portfolio
                          </button>
                        )}
                        <button
                          className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => signOut()}
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-500" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="sm:hidden bg-white dark:bg-[#4a1424] pb-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-1 px-2">
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <HomeIcon className="mr-3 h-5 w-5" />
                    Dashboard
                  </div>
                </Link>
                <Link
                  href="/badges"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <TrophyIcon className="mr-3 h-5 w-5" />
                    Badges
                  </div>
                </Link>
                {!isTeacher && (
                  <Link
                    href="/portfolio"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <BookOpenIcon className="mr-3 h-5 w-5" />
                      My Portfolio
                    </div>
                  </Link>
                )}
                {(isTeacher || isAdmin) && (
                  <>
                    <Link
                      href="/badges/create"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <PlusIcon className="mr-3 h-5 w-5" />
                        Create Badge
                      </div>
                    </Link>
                    <Link
                      href="/admin/portfolios"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <FolderIcon className="mr-3 h-5 w-5" />
                        Portfolios
                      </div>
                    </Link>
                  </>
                )}
                <Link
                  href="/submissions"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <ClipboardDocumentCheckIcon className="mr-3 h-5 w-5" />
                    {session?.user && ((session.user as any).role === 'teacher' || (session.user as any).role === 'admin') ? 'Review Submissions' : 'My Submissions'}
                  </div>
                </Link>
                <Link
                  href="/community"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <UsersIcon className="mr-3 h-5 w-5" />
                    Community
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="transition-all duration-300">
          {children}
        </div>
      </main>
    </div>
  );
} 