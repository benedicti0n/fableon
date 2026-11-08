import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@fableon/shared",
    "@fableon/scene-schema",
    "@fableon/animation-core",
    "@fableon/render-engine",
    "@fableon/paint-engine",
  ],
  // Fableon owns its agent guidance in docs/DEVELOPMENT_PROTOCOL.md. Next's
  // generated block would otherwise dirty the tree on every `next dev` run.
  agentRules: false,
};

export default nextConfig;
