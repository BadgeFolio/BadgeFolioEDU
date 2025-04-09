'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { isSuperAdmin } from '@/lib/email';
import { User, UserRole } from '@/types';
import toast from 'react-hot-toast';
import { 
  UserIcon as HeroUserIcon, 
  TrashIcon as HeroTrashIcon, 
  PencilIcon as HeroPencilIcon,
  ExclamationTriangleIcon as HeroExclamationTriangleIcon,
  UserGroupIcon as HeroUserGroupIcon,
  ShieldCheckIcon as HeroShieldCheckIcon,
  CheckIcon as HeroCheckIcon
} from '@heroicons/react/24/outline';

// Extend User type to include the _id property needed for this component
interface ExtendedUser extends User {
  _id: string;
}

// Define a type for our role filtering
type RoleTab = 'all' | UserRole;

// Create React functional components for icons to fix TypeScript errors
const UserIcon = (props: React.ComponentProps<'svg'>) => <HeroUserIcon {...props} />;
const TrashIcon = (props: React.ComponentProps<'svg'>) => <HeroTrashIcon {...props} />;
const PencilIcon = (props: React.ComponentProps<'svg'>) => <HeroPencilIcon {...props} />;
const ExclamationTriangleIcon = (props: React.ComponentProps<'svg'>) => <HeroExclamationTriangleIcon {...props} />;
const UserGroupIcon = (props: React.ComponentProps<'svg'>) => <HeroUserGroupIcon {...props} />;
const ShieldCheckIcon = (props: React.ComponentProps<'svg'>) => <HeroShieldCheckIcon {...props} />;
const CheckIcon = (props: React.ComponentProps<'svg'>) => <HeroCheckIcon {...props} />;

// Define MainLayout props type
interface MainLayoutProps {
  children: React.ReactNode;
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<RoleTab>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ExtendedUser | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Check if user is authorized to view this page
  useEffect(() => {
    if (status === 'authenticated') {
      // Only allow admins to access this page
      if (!session?.user?.role || session.user.role !== 'admin') {
        router.push('/dashboard');
        toast.error('You do not have permission to access this page');
      } else {
        fetchUsers();
      }
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Error fetching users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      // Remove user from state
      setUsers(users.filter(user => user._id !== userId));
      toast.success('User deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Error deleting user');
    }
  };

  const handleDeleteUsers = async () => {
    try {
      // Delete each selected user
      await Promise.all(selectedUsers.map(userId => 
        fetch(`/api/users/${userId}`, { method: 'DELETE' })
      ));
      
      // Update state
      setUsers(users.filter(user => !selectedUsers.includes(user._id)));
      setSelectedUsers([]);
      toast.success(`${selectedUsers.length} users deleted successfully`);
    } catch (err) {
      console.error(err);
      toast.error('Error deleting users');
    } finally {
      setShowBulkDeleteModal(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user._id));
    }
  };

  const filteredUsers = activeTab === 'all' 
    ? users 
    : users.filter(user => user.role === activeTab);

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldCheckIcon className="h-4 w-4" />;
      case 'teacher':
        return <UserGroupIcon className="h-4 w-4" />;
      case 'student':
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  if (status === 'loading') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          
          {/* Role filter tabs */}
          <div className="mt-4 border-b border-gray-200">
            <div className="flex space-x-4">
              {(['all', 'admin', 'teacher', 'student'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 px-1 ${
                    activeTab === tab
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center mt-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="mt-8 text-center text-red-500">{error}</div>
          ) : (
            <>
              {selectedUsers.length > 0 && (
                <div className="mt-4 flex justify-between items-center bg-gray-50 p-3 rounded-md">
                  <div>{selectedUsers.length} users selected</div>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="flex items-center text-sm text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete Selected
                  </button>
                </div>
              )}
              
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => handleSelectUser(user._id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-gray-500" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                            <span className="flex items-center">
                              {getRoleIcon(user.role)}
                              <span className="ml-1 capitalize">{user.role}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button 
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => router.push(`/admin/users/${user._id}`)}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-900"
                              onClick={() => {
                                setUserToDelete(user);
                                setShowDeleteModal(true);
                              }}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete User Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete User</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete the user {userToDelete.name}? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    deleteUser(userToDelete._id);
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Users</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete {selectedUsers.length} users? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteUsers}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowBulkDeleteModal(false)}
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