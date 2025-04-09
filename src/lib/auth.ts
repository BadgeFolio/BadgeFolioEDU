import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DefaultSession } from 'next-auth';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import bcrypt from 'bcryptjs';
import { isBuildPhase, env } from '@/lib/env';
import { normalizeEmail } from '@/lib/email';

// Extend the built-in types
declare module 'next-auth' {
  interface User {
    _id?: string;
    role?: string;
    requirePasswordChange?: boolean;
  }
  interface Session {
    user: {
      _id?: string;
      role?: string;
      error?: string;
      requirePasswordChange?: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    _id?: string;
    role?: string;
    error?: string;
    requirePasswordChange?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
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

        // During build phase, return mock data to avoid database queries
        if (isBuildPhase) {
          console.log('Build phase detected in auth.ts, returning mock user');
          return {
            id: 'mock-id',
            email: credentials.email,
            name: 'Mock User',
            role: 'student',
            image: null
          };
        }

        try {
          await dbConnect();
          // Convert email to lowercase for case-insensitive lookup
          const normalizedEmail = credentials.email.toLowerCase().trim();
          console.log('Looking for user with email:', normalizedEmail);
          
          const user = await User.findOne({ email: normalizedEmail });
          
          if (!user) {
            // If user not found, log for debugging
            console.log(`User with email ${normalizedEmail} not found. Trying to find similar emails...`);
            
            // For debugging, check if there's a case sensitivity issue
            const similarUsers = await User.find({ 
              email: { $regex: new RegExp(`^${normalizedEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } 
            });
            
            if (similarUsers.length > 0) {
              console.log('Found similar users with case differences:', similarUsers.map((u: any) => u.email));
              
              // Automatically fix the case issue by updating the user's email to lowercase
              if (similarUsers.length === 1) {
                const userToFix = similarUsers[0];
                console.log(`Fixing email case for user ${userToFix.name}: ${userToFix.email} → ${normalizedEmail}`);
                
                await User.updateOne(
                  { _id: userToFix._id },
                  { $set: { email: normalizedEmail } }
                );
                
                // Use the user with fixed email
                const updatedUser = await User.findById(userToFix._id);
                
                // Check password for the fixed user
                const isPasswordValid = await bcrypt.compare(credentials.password, updatedUser.password);
                
                if (!isPasswordValid) {
                  throw new Error('Invalid password');
                }
                
                return {
                  id: updatedUser._id.toString(),
                  email: updatedUser.email,
                  name: updatedUser.name,
                  role: updatedUser.role,
                  image: updatedUser.image
                };
              }
            }
            
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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token._id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user._id = token._id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: env.NEXTAUTH_SECRET,
}; 