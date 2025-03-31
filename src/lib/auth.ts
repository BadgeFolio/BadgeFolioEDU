import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DefaultSession } from 'next-auth';
import dbConnect from '@/lib/mongoose';
import { User } from '@/lib/models';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

        try {
          await dbConnect();
          console.log('Looking for user with email:', credentials.email);
          
          // Check both MongoDB and Prisma for the user
          const [mongoUser, prismaUser] = await Promise.all([
            User.findOne({ email: credentials.email }),
            prisma.user.findUnique({ where: { email: credentials.email } })
          ]);

          // If user exists in one system but not the other, try to synchronize
          if (mongoUser && !prismaUser) {
            console.log('User exists in MongoDB but not in Prisma, synchronizing...');
            try {
              await prisma.user.create({
                data: {
                  name: mongoUser.name,
                  email: mongoUser.email,
                  password: mongoUser.password,
                  role: mongoUser.role,
                  requirePasswordChange: mongoUser.requirePasswordChange
                }
              });
              console.log('Successfully synchronized user to Prisma');
            } catch (error) {
              console.error('Failed to sync user to Prisma:', error);
              // Continue with MongoDB user
            }
          } else if (!mongoUser && prismaUser) {
            console.log('User exists in Prisma but not in MongoDB, synchronizing...');
            try {
              await User.create({
                name: prismaUser.name,
                email: prismaUser.email,
                password: prismaUser.password,
                role: prismaUser.role,
                requirePasswordChange: prismaUser.requirePasswordChange
              });
              console.log('Successfully synchronized user to MongoDB');
            } catch (error) {
              console.error('Failed to sync user to MongoDB:', error);
              throw new Error('Failed to synchronize user account');
            }
          }

          // Use MongoDB user for authentication as it's our primary store
          const user = mongoUser || await User.findOne({ email: credentials.email });

          if (!user) {
            console.log('No user found with email:', credentials.email);
            // Check if there's a pending invitation
            const invitation = await prisma.invitation.findFirst({
              where: {
                email: credentials.email,
                status: 'pending'
              }
            });

            if (invitation) {
              console.log('Found pending invitation for email:', credentials.email);
              throw new Error('You have a pending invitation that needs to be completed. Please check your email for the invitation link or contact an administrator.');
            }

            throw new Error('No user found with this email');
          }

          console.log('Found user, checking password:', credentials.email);
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            console.log('Invalid password for user:', credentials.email);
            throw new Error('Invalid password');
          }

          console.log('Successfully authenticated user:', credentials.email);
          console.log('User role:', user.role);
          console.log('Requires password change:', user.requirePasswordChange);

          return {
            id: user._id.toString(),
            _id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            requirePasswordChange: user.requirePasswordChange
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
        token._id = user._id;
        token.requirePasswordChange = user.requirePasswordChange;
      } else if (trigger === 'update' || !token.role) {
        // Check for role updates on session updates or if role is missing
        try {
          await dbConnect();
          const dbUser = await User.findOne({ email: token.email });
          if (dbUser) {
            token.role = dbUser.role;
            token._id = dbUser._id.toString();
            token.requirePasswordChange = dbUser.requirePasswordChange;
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
        session.user._id = token._id;
        session.user.requirePasswordChange = token.requirePasswordChange;
        
        // Fetch latest user data
        try {
          await dbConnect();
          const user = await User.findOne({ email: session.user.email });
          if (user) {
            session.user.role = user.role;
            session.user._id = user._id.toString();
            session.user.requirePasswordChange = user.requirePasswordChange;
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
  secret: process.env.NEXTAUTH_SECRET,
}; 