import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // ✅ Allow MOSCOT + Shopify CDNs
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'moscot.com',
        pathname: '/cdn/shop/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/s/files/**',
      },
    ],
  },
};

export default nextConfig;
