'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';
import { PlusIcon, ExclamationCircleIcon, CodeBracketIcon, GlobeAltIcon, ChartBarIcon, PaintBrushIcon, ChatBubbleBottomCenterTextIcon, CalculatorIcon, BeakerIcon, LanguageIcon, TagIcon } from '@heroicons/react/24/outline';

interface Category {
  _id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
}

// Add interface for edited categories
interface EditedCategory extends Category {
  isEdited?: boolean;
}

const SUPER_ADMIN_EMAIL = 'emailmrdavola@gmail.com';
const COLORS = ['blue', 'green', 'red', 'purple', 'pink', 'indigo', 'teal'] as const;

// Add this color mapping object after COLORS
const COLOR_CLASSES = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500'
} as const;

export default function CategoryManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<EditedCategory[]>([]);
  const [formData, setFormData] = useState<Partial<Category>>({ 
    name: '', 
    description: '', 
    color: 'blue',
    createdAt: new Date().toISOString()
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [categoryToUpdate, setCategoryToUpdate] = useState<EditedCategory | null>(null);

  const isAdmin = (session?.user as any)?.role === 'admin';
  const isSuperAdmin = session?.user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin || isSuperAdmin) {
      fetchCategories();
    }
  }, [isAdmin, isSuperAdmin]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const createCategory = async () => {
    if (!formData.name?.trim()) {
      toast.error('Category name is required');
      return;
    }

    setLoading(true);
    try {
      // If creating ELA category, automatically set color to teal for better readability
      let colorToUse = formData.color;
      if (formData.name === 'ELA') {
        colorToUse = 'teal';
      }

      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: colorToUse
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create category');
      }

      toast.success('Category created successfully!');
      setFormData({ 
        name: '', 
        description: '', 
        color: 'blue',
        createdAt: new Date().toISOString()
      });
      setIsAddingNew(false);
      fetchCategories();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (category: EditedCategory) => {
    setLoading(true);
    try {
      const originalCategory = categories.find(c => c._id === category._id);
      const isNameChanged = originalCategory && originalCategory.name !== category.name;

      // Special handling for ELA category - always use teal for better readability
      let updatedColor = category.color;
      if (category.name === 'ELA') {
        updatedColor = 'teal';
      }
      
      // If changing to ELA name, suggest teal color
      if (isNameChanged && category.name === 'ELA' && category.color !== 'teal') {
        updatedColor = 'teal';
      }

      // Special handling for name changes
      if (isNameChanged && (originalCategory?.name === 'ELA' || category.name === 'ELA')) {
        // Warn about name changes from or to ELA
        setCategoryToUpdate({...category, color: updatedColor});
        setShowWarningModal(true);
        setLoading(false);
        return;
      }

      // Handle regular updates without warnings
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: {...category, color: updatedColor},
          updateBadges: false
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update category');
      }

      toast.success('Category updated successfully!');
      fetchCategories();
      setShowWarningModal(false);
      setCategoryToUpdate(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const confirmCategoryUpdate = () => {
    if (categoryToUpdate) {
      saveCategoryWithBadgeUpdates(categoryToUpdate);
    }
  };

  const saveCategoryWithBadgeUpdates = async (category: EditedCategory) => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: category,
          updateBadges: true // Always update badges when confirming after warning
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update category');
      }

      const updatedCategory = await res.json();
      setCategories(categories.map(c => c._id === updatedCategory._id ? updatedCategory : c));
      toast.success('Category updated successfully');
      setShowWarningModal(false);
      setCategoryToUpdate(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only super admin can delete categories');
      return;
    }

    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }

      toast.success('Category deleted successfully!');
      fetchCategories();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData(category);
    setShowEditModal(true);
  };

  const handleDeleteConfirm = (categoryId: string) => {
    setFormData({ 
      _id: categoryId, 
      name: '', 
      description: '', 
      color: 'blue',
      createdAt: new Date().toISOString()
    });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (formData._id) {
      await deleteCategory(formData._id);
    }
    setShowDeleteModal(false);
  };

  const handleFieldChange = (id: string, field: keyof Category, value: string) => {
    setCategories(categories.map(category => {
      if (category._id === id) {
        return { ...category, [field]: value, isEdited: true };
      }
      return category;
    }));
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '', 
      color: 'blue',
      createdAt: new Date().toISOString()
    });
  };

  const getCategoryIcon = (categoryName: string) => {
    const icons = {
      'Programming': CodeBracketIcon,
      'Web': GlobeAltIcon,
      'Data Science': ChartBarIcon,
      'Design': PaintBrushIcon,
      'Design Thinking': PaintBrushIcon,
      'ELA': ChatBubbleBottomCenterTextIcon,
      'Math': CalculatorIcon,
      'Science': BeakerIcon,
      'Languages': LanguageIcon,
      'Python': CodeBracketIcon,
      'Scratch': CodeBracketIcon,
      'Social Studies': GlobeAltIcon,
      'Demo': TagIcon,
    };

    return icons[categoryName as keyof typeof icons] || CodeBracketIcon;
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

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Only administrators can manage categories.</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Category Management</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Manage badge categories and their properties
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setIsAddingNew(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Category
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          {isAddingNew && (
            <div className="mb-6 bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Color
                  </label>
                  <select
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsAddingNew(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createCategory}
                    disabled={loading}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
                  >
                    Create Category
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mt-4">
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-grow">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${COLOR_CLASSES[category.color as keyof typeof COLOR_CLASSES]}`}></div>
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => handleFieldChange(category._id, 'name', e.target.value)}
                            className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          value={category.description || ''}
                          onChange={(e) => handleFieldChange(category._id, 'description', e.target.value)}
                          placeholder="Add a description..."
                          className="mt-1 text-sm text-gray-500 dark:text-gray-400 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 focus:outline-none w-full"
                        />
                      </div>
                      <div className="flex items-center space-x-4">
                        <select
                          value={category.color}
                          onChange={(e) => handleFieldChange(category._id, 'color', e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          {COLORS.map((color) => (
                            <option key={color} value={color}>
                              {color.charAt(0).toUpperCase() + color.slice(1)}
                            </option>
                          ))}
                        </select>
                        
                        {category.isEdited && (
                          <button
                            onClick={() => updateCategory(category)}
                            disabled={loading}
                            className="px-3 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50"
                          >
                            Save
                          </button>
                        )}
                        
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteConfirm(category._id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal for Category Name Change */}
      {showWarningModal && categoryToUpdate && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-40"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full mx-auto shadow-xl p-6">
            <div className="flex items-center text-yellow-600 dark:text-yellow-500 mb-4">
              <ExclamationCircleIcon className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-medium">Warning: Category Name Change</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Changing the category name from <strong className="text-gray-900 dark:text-white">{categories.find(c => c._id === categoryToUpdate._id)?.name}</strong> to <strong className="text-gray-900 dark:text-white">{categoryToUpdate.name}</strong> will also update all badges associated with this category. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setCategoryToUpdate(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmCategoryUpdate}
                disabled={loading}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Proceed Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
} 