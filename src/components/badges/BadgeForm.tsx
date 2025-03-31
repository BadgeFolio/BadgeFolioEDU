'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge, Category, SimplifiedCategory } from '@/types';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface FormData {
  name: string;
  description: string;
  criteria: string;
  difficulty: number;
  category: string;
  isPublic: boolean;
  image?: File;
}

interface BadgeFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: Partial<Omit<Badge, 'category'> & { category?: SimplifiedCategory | string }>;
}

export default function BadgeForm({ onSubmit, initialData }: BadgeFormProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    criteria: initialData?.criteria || '',
    difficulty: initialData?.difficulty || 1,
    category: typeof initialData?.category === 'object' ? initialData?.category?.name : (initialData?.category || ''),
    isPublic: initialData?.isPublic || false,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data);
        if (!formData.category && data.length > 0) {
          setFormData(prev => ({ ...prev, category: data[0].name }));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };

    fetchCategories();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('File must be an image');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setFormData({ ...formData, image: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Submitting form data:', {
        name: formData.name,
        description: formData.description,
        criteria: formData.criteria,
        difficulty: formData.difficulty,
        category: formData.category,
        isPublic: formData.isPublic,
        image: formData.image ? 'present' : 'not present'
      });

      const form = new FormData();
      form.append('name', formData.name);
      form.append('description', formData.description);
      form.append('criteria', formData.criteria);
      form.append('difficulty', formData.difficulty.toString());
      form.append('category', formData.category);
      form.append('isPublic', formData.isPublic.toString());
      if (formData.image) {
        form.append('image', formData.image);
      }

      await onSubmit(formData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save badge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Badge Image
        </label>
        <div className="mt-1 flex items-center space-x-4">
          <div className="flex justify-center items-center w-32 h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg overflow-hidden dark:bg-gray-800">
            {imagePreview ? (
              <Image
                src={imagePreview}
                alt="Badge preview"
                width={128}
                height={128}
                className="object-cover"
              />
            ) : (
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Upload image</p>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            ref={fileInputRef}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-200 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Upload a square image (max 5MB). This will be displayed when students earn the badge.
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="criteria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Criteria
        </label>
        <textarea
          id="criteria"
          required
          value={formData.criteria}
          onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Category
        </label>
        <select
          id="category"
          required
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        >
          {categories.map((category) => (
            <option key={category._id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Difficulty Level
        </label>
        <div className="mt-1 flex items-center">
          {Array(5).fill(0).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setFormData({ ...formData, difficulty: index + 1 })}
              className="focus:outline-none"
            >
              <svg
                className={`h-8 w-8 ${
                  index < formData.difficulty ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                } cursor-pointer hover:text-yellow-400 transition-colors duration-150`}
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {formData.difficulty} of 5
          </span>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublic"
          checked={formData.isPublic}
          onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
        />
        <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          Make this badge public (visible to all teachers)
        </label>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800"
        >
          {loading ? 'Saving...' : 'Create Badge'}
        </button>
      </div>
    </form>
  );
} 