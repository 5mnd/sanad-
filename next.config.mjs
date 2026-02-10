/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // PWA Configuration
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
}

export default nextConfig
