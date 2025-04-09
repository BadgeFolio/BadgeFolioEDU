'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogClose, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isSuperAdmin } from '@/lib/email';
import { User } from '@/types';
import { toast } from 'react-hot-toast';
import { 
  UserIcon, 
  TrashIcon, 
  DotsVerticalIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [processing, setProcessing] = useState(false);

  // Role-based access control
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'admin';
  const userIsSuperAdmin = session?.user?.email 
    ? isSuperAdmin(session.user.email)
    : false;

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || (!isAdmin && !userIsSuperAdmin)) {
      router.push('/dashboard');
      return;
    }
    
    fetchUsers();
  }, [session, router, isAdmin, userIsSuperAdmin, selectedTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/users';
      
      if (selectedTab === 'students') {
        endpoint = '/api/users/students';
      } else if (selectedTab === 'teachers') {
        endpoint = '/api/users/teachers';
      } else if (selectedTab === 'admins') {
        endpoint = '/api/users/role?role=admin';
      }
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/users/${userToDelete._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      
      toast.success(`Successfully deleted user ${userToDelete.name}`);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/users/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedUsers }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete users');
      }
      
      const result = await response.json();
      
      if (result.summary.deleted > 0) {
        toast.success(`Successfully deleted ${result.summary.deleted} users`);
      }
      
      if (result.protectedUsers.length > 0) {
        toast.error(`${result.protectedUsers.length} users could not be deleted`);
      }
      
      setBulkDeleteDialogOpen(false);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete users');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user._id || ''));
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-red-500">Admin</Badge>;
      case 'teacher':
        return <Badge variant="default" className="bg-blue-500">Teacher</Badge>;
      case 'student':
        return <Badge variant="default" className="bg-green-500">Student</Badge>;
      default:
        return <Badge variant="default" className="bg-gray-500">{role}</Badge>;
    }
  };

  const canDeleteUser = (user: User) => {
    // Super admin can delete anyone except self and other super admins
    if (userIsSuperAdmin) {
      return !isSuperAdmin(user.email || '') && user.email !== session?.user?.email;
    }
    
    // Regular admin can delete students and teachers, but not other admins or self
    if (isAdmin) {
      return user.role !== 'admin' && user.email !== session?.user?.email;
    }
    
    return false;
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage users, view profiles, and control account access</p>
          </div>
          
          {selectedUsers.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              Delete Selected ({selectedUsers.length})
            </Button>
          )}
        </div>
        
        <Tabs 
          defaultValue="all" 
          value={selectedTab} 
          onValueChange={setSelectedTab}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-1">
              <UserGroupIcon className="h-4 w-4" />
              All Users
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              Teachers
            </TabsTrigger>
            {(isAdmin || userIsSuperAdmin) && (
              <TabsTrigger value="admins" className="flex items-center gap-1">
                <ShieldCheckIcon className="h-4 w-4" />
                Admins
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <Table>
              <TableCaption>
                {users.length === 0 
                  ? 'No users found' 
                  : `Showing ${users.length} user${users.length !== 1 ? 's' : ''}`}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onCheckedChange={toggleSelectAll}
                      disabled={users.length === 0}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedUsers.includes(user._id || '')}
                        onCheckedChange={() => toggleSelectUser(user._id || '')}
                        disabled={!canDeleteUser(user)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.name}
                      {session?.user?.email === user.email && (
                        <Badge variant="outline" className="ml-2">You</Badge>
                      )}
                      {isSuperAdmin(user.email || '') && (
                        <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">Super Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role || 'student')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <DotsVerticalIcon className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => router.push(`/admin/portfolios/${user._id}`)}
                          >
                            View Profile
                          </DropdownMenuItem>
                          
                          {canDeleteUser(user) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                  setUserToDelete(user);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                Delete User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      {/* Delete Single User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-red-50 text-red-900 rounded-md">
            <p className="text-sm">All of the following data will be permanently deleted:</p>
            <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
              <li>User account and profile</li>
              <li>Submissions and earned badges</li>
              <li>Classroom enrollments</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>Note:</strong> Any badges created by this user will be reassigned to the system administrator.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={processing}>Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={processing}
              className="gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full" />
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              Delete Multiple Users
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUsers.length} selected users?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-red-50 text-red-900 rounded-md">
            <p className="text-sm">All of the following data will be permanently deleted for each user:</p>
            <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
              <li>User accounts and profiles</li>
              <li>Submissions and earned badges</li>
              <li>Classroom enrollments</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>Note:</strong> Any badges created by these users will be reassigned to the system administrator.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={processing}>Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={processing}
              className="gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full" />
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4" />
                  Delete {selectedUsers.length} Users
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
} 