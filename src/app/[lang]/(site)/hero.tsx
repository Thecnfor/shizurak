/**
 * 首页第一幕：一句话大标题 + kicker + tagline。
 * 原 GSAP SplitText 逐字入场已整条删除（幕语法 spec §4 首页①/§6.3）：进站是
 * 唯一一次「T1 自撕显现」——h1 元素级跑一次 hero-reveal（globals.css，几何与
 * rift-new 同源，300ms = T1 预算，easing/时长走 CSS 令牌）。CSS 动画挂载即播
 * 且只播一次，天然满足 once-per-full-page-load；零 JS、零 GSAP 依赖
 * （gsap 本体仍在 focusPull / RiftDirector 等处注册使用，此处不再引用）。
 * reduced-motion 的门控也在 CSS（文件尾 animation:none），组件保持纯展示——
 * 于是 hero 从客户端组件降级为服务端组件。
 */
export function Hero({
  title,
  tagline,
  kicker,
}: {
  title: string;
  tagline: string;
  kicker: string;
}) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-[var(--container-max)] flex-col justify-center px-6">
      <p className="mono-micro text-accent">{kicker}</p>
      <h1
        data-hero-title
        className="hero-title mt-4 max-w-[18ch] text-[length:var(--text-display-size)] font-semibold leading-[var(--text-display-lh)] tracking-[var(--text-display-tracking)]"
      >
        {title}
      </h1>
      <p className="mt-6 max-w-[62ch] text-[length:var(--text-body-size)] leading-[var(--text-body-lh)] text-ink-secondary">
        {tagline}
      </p>
    </section>
  );
}
