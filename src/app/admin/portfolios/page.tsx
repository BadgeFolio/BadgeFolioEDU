'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import toast from 'react-hot-toast';
import { User } from '@/types';
import { Tab } from '@headlessui/react';

export default function Portfolios() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');

  const isAdmin = (session?.user as any)?.role === 'admin';
  const isSuperAdmin = session?.user?.email === 'emailmrdavola@gmail.com';
  const isTeacher = (session?.user as any)?.role === 'teacher';

  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    if (!isAdmin && !isSuperAdmin && !isTeacher) {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
  }, [session, router, isAdmin, isSuperAdmin, isTeacher, selectedRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/users/students';
      
      // If admin/superadmin and teacher role is selected, use different endpoint
      if ((isAdmin || isSuperAdmin) && selectedRole === 'teacher') {
        endpoint = '/api/users/teachers';
      }
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Portfolios</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isTeacher && "View all students' badge portfolios"}
              {(isAdmin || isSuperAdmin) && "View all student and teacher portfolios"}
            </p>
          </div>

          {(isAdmin || isSuperAdmin) && (
            <div className="mb-6">
              <Tab.Group>
                <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                      ${selected
                        ? 'bg-white dark:bg-gray-800 shadow text-blue-700 dark:text-blue-400'
                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                      }`
                    }
                    onClick={() => setSelectedRole('student')}
                  >
                    Students
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                      ${selected
                        ? 'bg-white dark:bg-gray-800 shadow text-blue-700 dark:text-blue-400'
                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                      }`
                    }
                    onClick={() => setSelectedRole('teacher')}
                  >
                    Teachers
                  </Tab>
                </Tab.List>
              </Tab.Group>
            </div>
          )}

          <div className="mb-6">
            <input
              type="text"
              placeholder={`Search ${selectedRole}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <li className="px-6 py-10 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No users found</p>
                </li>
              ) : (
                filteredUsers.map((user) => (
                  <li key={user.id}>
                    <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                      <div className="flex items-center">
                        {user.image && (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="h-10 w-10 rounded-full"
                          />
                        )}
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{user.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => router.push(`/portfolio/${user.id}`)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                          View Portfolio
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 