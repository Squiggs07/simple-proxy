import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The parent repo has its own lockfile; keep tracing rooted here.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
