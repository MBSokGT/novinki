import type { NextConfig } from "next";

const pocketbaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
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

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(isStaticExport && {
    output: "export",
    trailingSlash: true,
    basePath: "/novinki",
  }),
  env: {
    NEXT_PUBLIC_BASE_PATH: isStaticExport ? "/novinki" : "",
  },
  images: {
    // Static export requires unoptimized images (no server to optimise)
    unoptimized: isStaticExport || !pocketbaseUrl,
    remotePatterns: [
      ...(pocketbasePattern ? [pocketbasePattern] : []),
      // picsum images used in demo mode
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  ...(isStaticExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "X-Frame-Options", value: "DENY" },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "origin-when-cross-origin" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
