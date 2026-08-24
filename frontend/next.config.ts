import type { NextConfig } from "next";

const SUPABASE_PUBLIC =
  "https://tftlysimqcrwjyncjvvf.supabase.co/storage/v1/object/public";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {},
  },
  async rewrites() {
    return [
      // Site media served from our own domain.
      //
      // The generated pages referenced storage directly, so every image and
      // video on a site we are asking someone to pay for pointed at
      // <project>.supabase.co/.../demo-media/L26000421575/hero.mp4. Right-click
      // an image, copy the address, and the page stops looking like theirs.
      //
      // A rewrite proxies at the edge rather than through a function, so the
      // video is not pulled into serverless memory on the way past.
      {
        source: "/m/:path*",
        destination: `${SUPABASE_PUBLIC}/demo-media/:path*`,
      },
    ];
  },
};

export default nextConfig;
