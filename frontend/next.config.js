/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'bluewhale-documents.s3.amazonaws.com'],
  },
}

module.exports = nextConfig
