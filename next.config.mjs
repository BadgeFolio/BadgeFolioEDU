/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com'],
    unoptimized: true
  },
  // Add MongoDB configuration
  experimental: {
    serverComponentsExternalPackages: ['mongoose']
  }
};

export default nextConfig; 