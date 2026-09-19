import { ImageResponse } from "next/og";

// 动态 OG 图（1200×630）：站点/文章共用，void 深空底 + 大标题。
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "shizurak").slice(0, 90);
  const sub = (searchParams.get("sub") ?? "The agent-native blog engine").slice(
    0,
    140,
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background:
          "radial-gradient(ellipse at 70% 20%, #101830 0%, #05060a 62%)",
        color: "#f2f5fa",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 26,
          letterSpacing: 6,
          color: "#7ee0d6",
        }}
      >
        shizurak
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 27, color: "#9fb0c8" }}>
          {sub}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 22, color: "#5a6c86" }}>
        blog.xrak.top
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "cache-control": "public, max-age=86400, immutable" },
    },
  );
}
