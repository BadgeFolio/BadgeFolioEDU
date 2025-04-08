/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com'],
    unoptimized: true
  },
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/badgefolio' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/badgefolio/' : '',
};

export default nextConfig; 