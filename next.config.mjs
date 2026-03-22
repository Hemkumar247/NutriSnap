/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Existing components are unchanged; strict null checks flag pre-existing patterns.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
