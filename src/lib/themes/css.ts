import type { Theme, ThemeMode } from "@/themes/contract";

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function tokensToDecls(theme: Theme, mode: ThemeMode): string {
  const t = theme.tokens[mode];
  if (!t) throw new Error(`${theme.meta.id}:${mode} 缺少令牌`);
  const decls: string[] = [];
  for (const [key, value] of Object.entries(t.color)) {
    // 契约 v2 废除访客色相个性化：色值直出，不再包 oklch(from …) hue-rotate 钩子
    decls.push(`  --${kebab(key)}: ${value};`);
  }
  for (const [key, value] of Object.entries(t.shape))
    decls.push(`  --${kebab(key)}: ${value};`);
  for (const [key, value] of Object.entries(t.elevation))
    decls.push(`  --${kebab(key)}: ${value};`);
  for (const [key, value] of Object.entries(t.texture))
    decls.push(`  --${kebab(key)}: ${value};`);
  decls.push(`  --space-unit: ${t.space.unit}px;`);
  decls.push(`  --container-max: ${t.space.containerMax};`);
  decls.push(`  --gutter: ${t.space.gutter};`);
  decls.push(`  --section-y: ${t.space.sectionY};`);
  decls.push(`  --font-sans: ${t.typography.sans};`);
  decls.push(`  --font-mono: ${t.typography.mono};`);
  decls.push(`  --font-display: ${t.typography.display};`);
  for (const [level, v] of Object.entries(t.typography.scale)) {
    decls.push(`  --text-${kebab(level)}-size: ${v.size};`);
    decls.push(`  --text-${kebab(level)}-lh: ${v.lineHeight};`);
    decls.push(`  --text-${kebab(level)}-tracking: ${v.tracking};`);
    decls.push(`  --text-${kebab(level)}-weight: ${v.weight};`);
  }
  return decls.join("\n");
}

export function themeVarsCss(themes: Theme[]): string {
  const blocks: string[] = [
    "/* 自动生成：scripts/gen-theme-css.ts —— 请勿手改 */",
  ];
  for (const theme of themes) {
    for (const mode of theme.meta.modes) {
      const selector =
        theme.meta.modes.length === 1
          ? `[data-theme="${theme.meta.id}"], [data-theme="${theme.meta.id}"][data-mode="${mode}"]`
          : `[data-theme="${theme.meta.id}"][data-mode="${mode}"]`;
      blocks.push(`${selector} {\n${tokensToDecls(theme, mode)}\n}`);
    }
  }
  return `${blocks.join("\n\n")}\n`;
}
