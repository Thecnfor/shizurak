import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  // M4：Next standalone 产物，供多阶段 Dockerfile 打薄镜像
  output: "standalone",
  // 审计 F-8：不泄露技术栈指纹
  poweredByHeader: false,
  async headers() {
    // 安全基线（RSC 内联脚本使全量 CSP 价值有限，取零误伤组合）：
    // frame-ancestors 防点击劫持、禁 MIME 嗅探、限 Referer 外泄、关掉设备能力、强制 HSTS。
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
