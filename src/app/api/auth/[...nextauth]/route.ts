import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering for this route - required for proper NextAuth.js functionality
export const dynamic = 'force-dynamic';

// Handle NextAuth requests
const handler = NextAuth(authOptions);

// Export the handler
export { handler as GET, handler as POST }; 