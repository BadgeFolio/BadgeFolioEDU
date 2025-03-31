'use client';

import { Portfolio } from './Portfolio';

interface ClientPortfolioProps {
  userId: string;
}

export function ClientPortfolio({ userId }: ClientPortfolioProps) {
  return <Portfolio userId={userId} />;
} 