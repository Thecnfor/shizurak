// Next 自动加载的运行时插桩入口（架构规范 §12 观测）。
// 仅在 Node 运行时且显式开启 OTEL_ENABLED 时注册；@vercel/otel 会读取
// OTEL_EXPORTER_OTLP_ENDPOINT 等环境变量导出到集群 Tempo/Loki/Prometheus。
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.OTEL_ENABLED !== "1") return;
  const { registerOTel } = await import("@vercel/otel");
  registerOTel({ serviceName: "shizurak-web" });
}
