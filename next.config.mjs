/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com', 'res.cloudinary.com'],
  },
  // Ensure server-side features work properly
  output: 'standalone', // This is better for server components than 'export'
  experimental: {
    // Empty experimental object - serverActions is enabled by default in Next.js 14+
  },
  // Handle environment variables for build vs runtime
  webpack: (config, { isServer }) => {
    // Important for Next.js route handlers
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Log environment info during build
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('Building in production mode');
      console.log(`Environment variables available: ${Object.keys(process.env)
        .filter(key => !key.startsWith('npm_'))
        .join(', ')}`);
      console.log(`MONGODB_URI defined: ${!!process.env.MONGODB_URI}`);
      console.log(`NEXTAUTH_SECRET defined: ${!!process.env.NEXTAUTH_SECRET}`);
      console.log(`NEXTAUTH_URL defined: ${!!process.env.NEXTAUTH_URL}`);
    }
    
    return config;
  },
  // Set environment variables for client-side
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000',
  },
};

export default nextConfig; 