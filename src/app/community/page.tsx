'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import MainLayout from '@/components/layout/MainLayout';
import Image from 'next/image';

interface EarnedBadge {
  _id: string;
  badge: {
    _id: string;
    name: string;
    description: string;
    image?: string;
    difficulty: number;
  };
  student: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  reactions: {
    type: '👏' | '🎉' | '🌟' | '🏆' | '💪';
    users: string[];
  }[];
  createdAt: string;
}

interface PublishedBadge {
  _id: string;
  name: string;
  description: string;
  image?: string;
  difficulty: number;
  creatorId: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  reactions: {
    type: '👏' | '🎉' | '🌟' | '🏆' | '💪';
    users: string[];
  }[];
  createdAt: string;
}

interface CommunityEvent {
  type: 'earned' | 'published';
  item: EarnedBadge | PublishedBadge;
  timestamp: string;
}

const reactionEmojis = ['👏', '🎉', '🌟', '🏆', '💪'] as const;

export default function CommunityWallPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [publishedBadges, setPublishedBadges] = useState<PublishedBadge[]>([]);
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCommunityData();
    }
  }, [status]);

  const fetchCommunityData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Fetch earned badges
      const earnedRes = await fetch('/api/community');
      if (!earnedRes.ok) {
        const errorData = await earnedRes.json();
        throw new Error(errorData.error || 'Failed to fetch earned badges');
      }
      const earnedData = await earnedRes.json();
      setEarnedBadges(earnedData);
      
      // Fetch recently published badges
      const publishedRes = await fetch('/api/badges?recent=true');
      if (!publishedRes.ok) {
        const errorData = await publishedRes.json();
        throw new Error(errorData.error || 'Failed to fetch published badges');
      }
      const publishedData = await publishedRes.json();
      
      // Transform published badges to include reactions array if not present
      const formattedPublishedBadges = publishedData.map((badge: any) => ({
        ...badge,
        reactions: badge.reactions || []
      }));
      
      setPublishedBadges(formattedPublishedBadges);
      
      // Combine both types of events and sort by date
      const events: CommunityEvent[] = [
        ...earnedData.map((badge: EarnedBadge) => ({
          type: 'earned' as const,
          item: badge,
          timestamp: badge.createdAt
        })),
        ...formattedPublishedBadges.map((badge: PublishedBadge) => ({
          type: 'published' as const,
          item: badge,
          timestamp: badge.createdAt
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setCommunityEvents(events);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load community wall');
      toast.error('Failed to load community wall');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (badgeId: string, reactionType: typeof reactionEmojis[number], eventType: 'earned' | 'published') => {
    try {
      const endpoint = eventType === 'earned' ? '/api/community' : '/api/badges/react';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId, type: reactionType }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add reaction');
      }

      const updatedBadge = await res.json();

      // Update local state based on event type
      if (eventType === 'earned') {
        setEarnedBadges(prev => prev.map(badge => 
          badge._id === badgeId ? { ...badge, reactions: updatedBadge.reactions } : badge
        ));
      } else {
        setPublishedBadges(prev => prev.map(badge => 
          badge._id === badgeId ? { ...badge, reactions: updatedBadge.reactions } : badge
        ));
      }
      
      // Update combined events
      setCommunityEvents(prev => prev.map(event => {
        if (event.type === eventType && event.item._id === badgeId) {
          return {
            ...event,
            item: {
              ...event.item,
              reactions: updatedBadge.reactions
            }
          };
        }
        return event;
      }));

      toast.success('Reaction updated!');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add reaction');
    }
  };

  const navigateToBadge = (badgeId: string) => {
    router.push(`/badges/${badgeId}`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Community Wall</h1>
          
          {error ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-red-600 dark:text-red-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Error Loading Community Wall</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{error}</p>
              <button
                onClick={() => fetchCommunityData()}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : communityEvents.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Activity Yet</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Be the first to earn a badge or check out recently published badges!</p>
              <button
                onClick={() => router.push('/badges')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                View Available Badges
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {communityEvents.map((event) => (
                <div key={`${event.type}-${event.item._id}`} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start space-x-6">
                      {/* Badge Image */}
                      <div 
                        className="flex-shrink-0 cursor-pointer" 
                        onClick={() => navigateToBadge(
                          event.type === 'earned' 
                            ? (event.item as EarnedBadge).badge._id 
                            : event.item._id
                        )}
                      >
                        {(event.type === 'earned' 
                          ? (event.item as EarnedBadge).badge.image 
                          : (event.item as PublishedBadge).image) ? (
                          <img
                            src={event.type === 'earned' 
                              ? (event.item as EarnedBadge).badge.image 
                              : (event.item as PublishedBadge).image}
                            alt={event.type === 'earned' 
                              ? (event.item as EarnedBadge).badge.name 
                              : (event.item as PublishedBadge).name}
                            className="w-24 h-24 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:shadow-md transition-shadow">
                            <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Badge Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 
                              className="text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                              onClick={() => navigateToBadge(
                                event.type === 'earned' 
                                  ? (event.item as EarnedBadge).badge._id 
                                  : event.item._id
                              )}
                            >
                              {event.type === 'earned' 
                                ? (event.item as EarnedBadge).badge.name 
                                : (event.item as PublishedBadge).name}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {event.type === 'earned' 
                                ? <>Earned by <span className="font-medium">{(event.item as EarnedBadge).student.name}</span> <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700">STUDENT</span></>
                                : <>Published by <span className="font-medium">{(event.item as PublishedBadge).creatorId.name}</span> <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700">TEACHER</span></>}
                              {' · '}{new Date(event.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.type === 'earned' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {event.type === 'earned' ? 'Badge Earned' : 'New Badge'}
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <p className="text-gray-600 dark:text-gray-300">
                            {event.type === 'earned' 
                              ? (event.item as EarnedBadge).badge.description 
                              : (event.item as PublishedBadge).description}
                          </p>
                        </div>

                        {/* Reactions */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {reactionEmojis.map((emoji) => {
                            const reactions = event.item.reactions || [];
                            const reaction = reactions.find(r => r.type === emoji);
                            const hasReacted = reaction?.users.includes(session.user?.email || '');
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(event.item._id, emoji, event.type)}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                                  hasReacted
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                <span className="mr-1">{emoji}</span>
                                <span>{reaction?.users.length || 0}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 