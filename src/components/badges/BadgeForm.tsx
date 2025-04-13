'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge, Category, SimplifiedCategory } from '@/types';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { ArrowUpTrayIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/outline';

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
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image || null);
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
    <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
              Badge Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Enter an awesome badge name"
            />
          </div>

          <div>
            <label className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
              Badge Image
            </label>
            <div className="flex flex-col items-center space-y-4">
              <div 
                className="flex justify-center items-center w-40 h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl 
                          overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 
                          border-4 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={imagePreview}
                      alt="Badge preview"
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
                      <div className="hidden group-hover:block text-white font-bold">Change Image</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 hover:scale-110 transition-transform">
                    <PhotoIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
                    <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Click to upload badge image
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      PNG, JPG or GIF (max 5MB)
                    </p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="category" className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input"
            >
              {categories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="difficulty" className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
              Difficulty Level
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Beginner</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Expert</span>
              </div>
              <div className="flex items-center justify-between">
                {Array(5).fill(0).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData({ ...formData, difficulty: index + 1 })}
                    className="focus:outline-none transform hover:scale-125 transition-transform"
                  >
                    <StarIcon
                      className={`h-10 w-10 ${
                        index < formData.difficulty ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                      } cursor-pointer hover:text-yellow-400 transition-colors duration-150`}
                      fill={index < formData.difficulty ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
              <div className="text-center mt-2">
                <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 rounded-full text-sm font-bold">
                  Level {formData.difficulty} of 5
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                formData.isPublic ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`${
                  formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </button>
            <label htmlFor="isPublic" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {formData.isPublic ? 'Public Badge - All teachers can see it' : 'Private Badge - Only you can see it'}
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-6 mt-8">
        <div>
          <label htmlFor="description" className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="input"
            placeholder="Describe what this badge represents..."
          />
        </div>

        <div>
          <label htmlFor="criteria" className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
            Criteria to Earn
          </label>
          <textarea
            id="criteria"
            required
            value={formData.criteria}
            onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
            rows={4}
            className="input"
            placeholder="How can students earn this badge? Be specific..."
          />
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button
          type="submit"
          disabled={loading}
          className="interactive-btn"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <SparklesIcon className="h-5 w-5 mr-2" />
              Create Badge
            </>
          )}
        </button>
      </div>
    </form>
  );
} 