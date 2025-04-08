/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com'],
    unoptimized: process.env.NODE_ENV === 'production'
  },
};

export default nextConfig; 