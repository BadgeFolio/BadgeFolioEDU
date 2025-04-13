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
  GlobeAltIcon,
  StarIcon
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
      return <CodeBracketIcon className="h-5 w-5 text-primary-500" />;
    case 'math':
      return <CalculatorIcon className="h-5 w-5 text-primary-500" />;
    case 'science':
      return <BeakerIcon className="h-5 w-5 text-primary-500" />;
    case 'literacy':
      return <BookOpenIcon className="h-5 w-5 text-primary-500" />;
    case 'global studies':
      return <GlobeAltIcon className="h-5 w-5 text-primary-500" />;
    default:
      return <AcademicCapIcon className="h-5 w-5 text-primary-500" />;
  }
};

export default function BadgeList({ badges, isSelectionMode = false, selectedBadges = [], onBadgeSelect }: BadgeListProps) {
  const renderDifficulty = (difficulty: number) => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <StarIcon
          key={index}
          className={`h-5 w-5 ${
            index < difficulty ? 'text-primary-500 fill-primary-500' : 'text-secondary-300 dark:text-secondary-600'
          }`}
        />
      ));
  };

  if (!badges.length) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <p className="text-secondary-500 dark:text-secondary-400">No badges found.</p>
      </motion.div>
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
          className="card group relative overflow-hidden"
          onClick={() => isSelectionMode && onBadgeSelect?.(badge._id)}
        >
          {isSelectionMode && (
            <div className="absolute top-2 right-2 z-10">
              <input
                type="checkbox"
                checked={selectedBadges.includes(badge._id)}
                onChange={() => onBadgeSelect?.(badge._id)}
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-secondary-300 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                {getCategoryIcon(badge.category)}
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary-500 transition-colors">
                  {badge.name}
                </h3>
              </div>
              {badge.isPublic && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100">
                  Public
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center space-x-1">
              {renderDifficulty(badge.difficulty)}
            </div>
            <p className="mt-3 text-sm text-secondary-500 dark:text-secondary-400 line-clamp-2">
              {badge.description}
            </p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-xs text-secondary-500 dark:text-secondary-400 italic">
                Difficulty: {badge.difficulty}/5
              </span>
              {!isSelectionMode && (
                <Link
                  href={`/badges/${badge._id}`}
                  className="btn btn-primary text-sm"
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