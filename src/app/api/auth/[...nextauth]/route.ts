// Mark this route as dynamic to ensure it's not statically optimized
export const dynamic = 'force-dynamic';

import { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@/types';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import bcrypt from 'bcryptjs';
import { DefaultSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Add dynamic configuration
export const runtime = 'nodejs';

// Extend the built-in types
declare module 'next-auth' {
  interface User {
    role?: string;
    requirePasswordChange?: boolean;
    _id?: string;
  }
  interface Session {
    user: {
      role?: string;
      error?: string;
      requirePasswordChange?: boolean;
      _id?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    error?: string;
    requirePasswordChange?: boolean;
    _id?: string;
  }
}

// List of allowed email domains
const ALLOWED_DOMAINS = ['gardencity.k12.ny.us', 'gmail.com'];

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Please provide process.env.NEXTAUTH_SECRET');
}

if (!process.env.MONGODB_URI) {
  throw new Error('Please provide process.env.MONGODB_URI');
}

const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        try {
          await dbConnect();
          const user = await User.findOne({ email: credentials.email });

          if (!user) {
            throw new Error('No user found with this email');
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image
          };
        } catch (error) {
          console.error('Error in authorize:', error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Initial sign in
        token.role = user.role;
      } else if (trigger === 'update' || !token.role) {
        // Check for role updates on session updates or if role is missing
        try {
          await dbConnect();
          const dbUser = await User.findOne({ email: token.email });
          if (dbUser) {
            token.role = dbUser.role;
          }
        } catch (error) {
          console.error('Error updating JWT:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        
        // Fetch latest user data
        try {
          await dbConnect();
          const user = await User.findOne({ email: session.user.email });
          if (user) {
            session.user.role = user.role;
          }
        } catch (error) {
          console.error('Error updating session:', error);
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signOut({ token }) {
      // Clear any custom claims
      if (token) {
        token.role = undefined;
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 