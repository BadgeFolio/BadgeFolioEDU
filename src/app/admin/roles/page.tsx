'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  selected?: boolean;
}

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';

export default function RoleManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sortBy, setSortBy] = useState<'role' | 'name' | 'email'>('role');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = session?.user?.email === SUPER_ADMIN_EMAIL;
  const isAdmin = (session?.user as any)?.role === 'admin';
  const isTeacher = (session?.user as any)?.role === 'teacher';
  const isStudent = (session?.user as any)?.role === 'student';

  useEffect(() => {
    if (isSuperAdmin || isAdmin || isTeacher) {
      fetchUsers();
    }
  }, [isSuperAdmin, isAdmin, isTeacher]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/role');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      
      // Filter the users based on the current user's role
      let filteredUsers = [...data];
      
      // Teachers can only see and manage students
      if (isTeacher) {
        filteredUsers = data.filter((user: User) => user.role === 'student');
      }
      
      // Admins can see teachers and students, but not other admins
      if (isAdmin && !isSuperAdmin) {
        filteredUsers = data.filter((user: User) => 
          user.role !== 'admin' || user.email === session?.user?.email
        );
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (email: string, newRole: string) => {
    // Validate role changes based on current user role
    if (isTeacher && newRole !== 'teacher') {
      toast.error('Teachers can only upgrade students to teacher role');
      return;
    }
    
    setLoading(true);
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
      setLoading(false);
    }
  };

  const resetPassword = async (email: string, password: string) => {
    // Find user to validate role before attempting reset
    const userToReset = users.find(user => user.email === email);
    
    if (!userToReset) {
      toast.error('User not found');
      return;
    }
    
    // Validate based on role
    if (isTeacher && userToReset.role !== 'student') {
      toast.error('Teachers can only reset passwords for students');
      return;
    }
    
    setLoading(true);
    try {
      // Find the user ID from our users array
      const userId = userToReset.id;
      
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to reset password');
      }

      toast.success('Password reset successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUserEmail('');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'role') {
      const roleOrder = { admin: 1, teacher: 2, student: 3 };
      return (roleOrder[a.role as keyof typeof roleOrder] || 0) - (roleOrder[b.role as keyof typeof roleOrder] || 0);
    }
    return a[sortBy].localeCompare(b[sortBy]);
  });

  // Filter users based on search query
  const filteredUsers = searchQuery 
    ? sortedUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedUsers;

  const inviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite user');
      }

      toast.success('User invited successfully!');
      setInviteEmail('');
      setShowInviteForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, selected: !user.selected } : user
    ));
  };

  const toggleAllUsers = () => {
    const allSelected = users.every(user => user.selected);
    setUsers(users.map(user => ({ ...user, selected: !allSelected })));
  };

  const bulkUpdateRoles = async (newRole: string) => {
    // Validate bulk role changes for teachers
    if (isTeacher && newRole !== 'teacher') {
      toast.error('Teachers can only upgrade students to teacher role');
      return;
    }
    
    const selectedUsers = users.filter(user => user.selected);
    if (selectedUsers.length === 0) {
      toast.error('Please select users to update');
      return;
    }
    
    // For teachers, make sure only students are selected
    if (isTeacher && selectedUsers.some(user => user.role !== 'student')) {
      toast.error('Teachers can only upgrade students to teachers');
      return;
    }

    setLoading(true);
    try {
      const promises = selectedUsers.map(user =>
        updateRole(user.email, newRole)
      );
      await Promise.all(promises);
      toast.success('Roles updated successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update some roles');
    } finally {
      setLoading(false);
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

  if (isStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Students cannot modify user roles.</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Role Management</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {isTeacher && "As a teacher, you can upgrade students to teachers"}
                {isAdmin && "As an admin, you can upgrade students to teachers and teachers to admins"}
                {isSuperAdmin && "As a super admin, you have full control over user roles"}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowInviteForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Invite User
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          {showInviteForm && (
            <div className="mb-6 bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    {(isAdmin || isSuperAdmin) && <option value="admin">Admin</option>}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={inviteUser}
                    disabled={loading}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
                  >
                    Send Invitation
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'role' | 'name' | 'email')}
                    className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="role">Sort by Role</option>
                    <option value="name">Sort by Name</option>
                    <option value="email">Sort by Email</option>
                  </select>
                  {users.some(user => user.selected) && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedRole || ''}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Bulk Change Role</option>
                        {!isTeacher && <option value="student">Student</option>}
                        <option value="teacher">Teacher</option>
                        {(isAdmin || isSuperAdmin) && <option value="admin">Admin</option>}
                      </select>
                      <button
                        onClick={() => {
                          if (selectedRole) {
                            bulkUpdateRoles(selectedRole);
                            setSelectedRole(null);
                          }
                        }}
                        disabled={!selectedRole || loading}
                        className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Search input */}
              <div className="mb-4">
                <div className="relative rounded-md shadow-sm max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        onChange={toggleAllUsers}
                        checked={users.length > 0 && users.every(user => user.selected)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={user.selected}
                          onChange={() => toggleUserSelection(user.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.image && (
                            <img className="h-8 w-8 rounded-full" src={user.image} alt="" />
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' :
                          user.role === 'teacher' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {/* Only show role dropdown if appropriate for current user */}
                        {(user.role === 'student' || !isTeacher) && (
                          <select
                            value={user.role}
                            onChange={(e) => updateRole(user.email, e.target.value)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                            disabled={loading}
                          >
                            {/* Filter options based on user role */}
                            {!isTeacher && <option value="student">Student</option>}
                            <option value="teacher">Teacher</option>
                            {(isAdmin || isSuperAdmin) && <option value="admin">Admin</option>}
                          </select>
                        )}
                        
                        {/* Show password reset button for appropriate users */}
                        {((isSuperAdmin) || 
                          (isAdmin && user.role !== 'admin') || 
                          (isTeacher && user.role === 'student')) && (
                          <button
                            onClick={() => {
                              setSelectedUserEmail(user.email);
                              setShowPasswordModal(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mt-2 block"
                          >
                            Reset Password
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Reset Password</h3>
              <div className="mt-2">
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setSelectedUserEmail('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => resetPassword(selectedUserEmail, newPassword)}
                  disabled={!newPassword || loading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
} 