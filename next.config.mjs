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
  },
  // Static export configuration
  output: 'export'
};

export default nextConfig; 