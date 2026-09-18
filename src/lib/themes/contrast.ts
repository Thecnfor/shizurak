function parseHex(hex: string): [number, number, number] {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) throw new Error(`非法 hex 色值: ${hex}（对比度检查仅支持 #rrggbb）`);
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort(
    (a, b) => b - a,
  );
  return (l1 + 0.05) / (l2 + 0.05);
}
