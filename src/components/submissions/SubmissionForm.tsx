'use client';

import { useState } from 'react';
import { Badge } from '@/types';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import RichTextEditor from '../editor/RichTextEditor';

interface SubmissionFormProps {
  badge: Badge;
}

export default function SubmissionForm({ badge }: SubmissionFormProps) {
  const router = useRouter();
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!evidence.trim()) {
        toast.error('Please provide evidence for your submission');
        return;
      }

      // Create the submission data with evidence text and set showEvidence to false by default
      const submissionData = {
        badgeId: badge._id,
        evidence: evidence.trim(),
        showEvidence: false
      };

      console.log('Submitting data:', JSON.stringify(submissionData, null, 2));

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      console.log('Submission response:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit evidence');
      }

      toast.success('Evidence submitted successfully');
      router.push('/submissions');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit evidence');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-4 rounded-md">
      <div>
        <label htmlFor="evidence" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Evidence
        </label>
        <div className="mt-1">
          <RichTextEditor
            value={evidence}
            onChange={setEvidence}
            placeholder="Describe what you did to earn this badge. Include any relevant links or details about your work."
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Use the toolbar to format your text or add links to your work.
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={submitting || !evidence.trim()}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Evidence'}
        </button>
      </div>
    </form>
  );
} 