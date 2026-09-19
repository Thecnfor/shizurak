import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  // M4：Next standalone 产物，供多阶段 Dockerfile 打薄镜像
  output: "standalone",
};

export default nextConfig;
