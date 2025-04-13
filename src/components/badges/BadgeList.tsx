'use client';

import { Badge } from '@/types';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  AcademicCapIcon, 
  BeakerIcon, 
  CalculatorIcon, 
  CodeBracketIcon,
  BookOpenIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface BadgeListProps {
  badges: Badge[];
  isSelectionMode?: boolean;
  selectedBadges?: string[];
  onBadgeSelect?: (badgeId: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'computational thinking':
      return <CodeBracketIcon className="h-5 w-5" />;
    case 'math':
      return <CalculatorIcon className="h-5 w-5" />;
    case 'science':
      return <BeakerIcon className="h-5 w-5" />;
    case 'literacy':
      return <BookOpenIcon className="h-5 w-5" />;
    case 'global studies':
      return <GlobeAltIcon className="h-5 w-5" />;
    default:
      return <AcademicCapIcon className="h-5 w-5" />;
  }
};

export default function BadgeList({ badges, isSelectionMode = false, selectedBadges = [], onBadgeSelect }: BadgeListProps) {
  const renderDifficulty = (difficulty: number) => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <svg
          key={index}
          className={`h-5 w-5 ${
            index < difficulty ? 'text-primary-500' : 'text-gray-300'
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
      {badges.map((badge, index) => (
        <motion.div
          key={badge._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg relative 
            ${isSelectionMode ? 'cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1' : ''}`}
          onClick={() => isSelectionMode && onBadgeSelect?.(badge._id)}
        >
          {isSelectionMode && (
            <div className="absolute top-2 right-2 z-10">
              <input
                type="checkbox"
                checked={selectedBadges.includes(badge._id)}
                onChange={() => onBadgeSelect?.(badge._id)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                {getCategoryIcon(badge.category)}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {badge.name}
                </h3>
              </div>
              {badge.isPublic && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100">
                  Public
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center">
              {renderDifficulty(badge.difficulty)}
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{badge.description}</p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                {badge.badges?.length || 0} Badges
              </span>
              {!isSelectionMode && (
                <Link
                  href={`/badges/${badge._id}`}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-100 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                >
                  View Details
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
} 