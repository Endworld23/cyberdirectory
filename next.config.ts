import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Allow remote logos while you're iterating.
    // (Tighten this list later by replacing '**' with specific hosts.)
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}

export default nextConfig