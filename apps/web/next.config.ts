import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@relo/core"],
  // Trace files from the monorepo root so the shared @relo/core package is bundled on Vercel.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};
export default nextConfig;
