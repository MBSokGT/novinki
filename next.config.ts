import type { NextConfig } from "next";

const pocketbaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const pocketbasePattern = (() => {
  if (!pocketbaseUrl) return null;
  try {
    const parsed = new URL(pocketbaseUrl);
    const protocol = parsed.protocol.replace(":", "");
    if (protocol !== "http" && protocol !== "https") return null;
    const pattern: RemotePattern = {
      protocol: protocol as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/api/files/**",
    };
    return pattern;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: pocketbasePattern ? [pocketbasePattern] : [],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
