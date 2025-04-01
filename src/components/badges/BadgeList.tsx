'use client';

import { Badge } from '@/types';
import Link from 'next/link';

interface BadgeListProps {
  badges: Badge[];
  isSelectionMode?: boolean;
  selectedBadges?: string[];
  onBadgeSelect?: (badgeId: string) => void;
}

export default function BadgeList({ badges, isSelectionMode = false, selectedBadges = [], onBadgeSelect }: BadgeListProps) {
  const renderDifficulty = (difficulty: number) => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <svg
          key={index}
          className={`h-5 w-5 ${
            index < difficulty ? 'text-yellow-400' : 'text-gray-300'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ));
  };

  if (!badges.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No badges found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge) => (
        <div
          key={badge._id}
          className={`bg-white overflow-hidden shadow rounded-lg relative ${
            isSelectionMode ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
          }`}
          onClick={() => isSelectionMode && onBadgeSelect?.(badge._id)}
        >
          {isSelectionMode && (
            <div className="absolute top-2 right-2 z-10">
              <input
                type="checkbox"
                checked={selectedBadges.includes(badge._id)}
                onChange={() => onBadgeSelect?.(badge._id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {badge.name}
              </h3>
              {badge.isPublic && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Public
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center">
              {renderDifficulty(badge.difficulty)}
            </div>
            <p className="mt-3 text-sm text-gray-500">{badge.description}</p>
            {!isSelectionMode && (
              <div className="mt-4">
                <Link
                  href={`/badges/${badge._id}`}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Details
                </Link>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 