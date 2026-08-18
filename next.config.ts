import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/**": ["./sample-data/**/*"],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
