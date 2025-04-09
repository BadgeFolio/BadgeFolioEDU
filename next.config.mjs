/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com'],
  },
  // Disable static exports since we're using server-side features
  output: 'standalone',
  // Enable server-side features
  experimental: {
    serverActions: true,
  }
};

export default nextConfig; 