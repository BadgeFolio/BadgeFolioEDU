'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import BadgeForm from '@/components/badges/BadgeForm';

interface FormData {
  name: string;
  description: string;
  criteria: string;
  difficulty: number;
  category: string;
  isPublic: boolean;
  image?: File;
}

export default function CreateBadgePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);

    try {
      // Create a new FormData object
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

      const res = await fetch('/api/badges', {
        method: 'POST',
        body: form
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error + (data.details ? ': ' + JSON.stringify(data.details) : ''));
      }

      toast.success('Badge created successfully');
      router.push(`/badges/${data._id}`);
    } catch (error) {
      console.error('Error creating badge:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create badge');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session || (session.user as any).role !== 'teacher') {
    router.push('/');
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Badge</h1>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800">
              <BadgeForm onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 