import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabase = new URL(supabaseUrl);
const isLocalSupabase = ["127.0.0.1", "localhost", "[::1]"].includes(supabase.hostname);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Product photos and banners are served from Supabase Storage.
    remotePatterns: [
      {
        protocol: supabase.protocol.replace(":", "") as "http" | "https",
        hostname: supabase.hostname,
        port: supabase.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // The local Supabase stack runs on 127.0.0.1; production uses *.supabase.co.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  experimental: {
    serverActions: {
      // Product CSV imports are sent as JSON in chunks; this leaves headroom.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
