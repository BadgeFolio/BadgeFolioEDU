/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
    unoptimized: process.env.NODE_ENV === 'production'
  },
  basePath: process.env.NODE_ENV === 'production' ? '/badgefolio' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/badgefolio/' : '',
}

module.exports = nextConfig 