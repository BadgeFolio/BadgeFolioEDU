# BadgeFolio

A platform for creating, earning, and managing digital badges in educational settings.

Last deployment test: 2025-04-06 01:27 UTC

## Features

- Google Sign-in and email/password authentication
- Role-based access control (Admin, Teacher, Student)
- Secure invite code system for admin and teacher registration
- Admin dashboard with system settings and user management
- Badge creation and management
- Badge submission and validation
- Learning pathways
- Community achievement wall
- Google Classroom integration (coming soon)

## Tech Stack

- Next.js 13+ with App Router
- TypeScript
- Tailwind CSS
- NextAuth.js for authentication
- MongoDB for database
- Firebase for file storage (optional)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your environment variables:
   ```
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   MONGODB_URI=your-mongodb-uri
   ADMIN_INVITE_CODE=your-secure-admin-code
   TEACHER_INVITE_CODE=your-secure-teacher-code
   ```

4. Set up Google OAuth:
   - Go to the [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - Your production URL when deployed

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Role-Based Access

BadgeFolio implements a secure role-based access control system:

### Student Role (Default)
- Can earn badges
- Submit work for badge completion
- View personal progress
- Access the community achievement wall

### Teacher Role
- Requires a valid teacher invite code during registration
- Can create and manage badges
- Review and validate student submissions
- Access student portfolios
- View system analytics

### Admin Role
- Requires a valid admin invite code during registration
- Full access to system settings
- User role management
- Invite code management
- System maintenance tools
- Complete analytics dashboard

## Invite Code Management

Administrators can manage invite codes through the admin dashboard:

1. Navigate to Admin Dashboard > System Settings
2. Find the "Invite Code Management" section
3. Update the invite codes for admin and teacher roles
4. Changes are immediately effective for new registrations

For security best practices:
- Change invite codes periodically
- Use strong, unique codes
- Share codes securely with intended recipients
- Monitor user registrations

## Project Structure

```
src/
├── app/                 # Next.js 13 app directory
├── components/         # React components
├── lib/               # Utility functions and configurations
└── types/             # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 