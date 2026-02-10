/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Electron
  output: 'export',
  
  // Use relative paths for assets (critical for file:// protocol in Electron)
  assetPrefix: './',
  
  // Add trailing slashes to URLs
  trailingSlash: true,
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Ignore TypeScript errors during build (for CI/CD)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Ignore ESLint errors during build (for CI/CD)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // React strict mode
  reactStrictMode: true,
  
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  
  // Webpack configuration for Electron compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix for 'fs' module in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
}

export default nextConfig
