import {
  Mesh,
  type OGLRenderingContext,
  Program,
  Renderer,
  Triangle,
} from "ogl";

export interface RiftUniforms {
  t: number;
  res: [number, number];
  mouse: [number, number];
  breath: number;
  flash: number;
  tear: number;
  collapse: number;
  shift: number;
  time: number;
}

/** 纯 uniform 状态机（无 GL 依赖，jsdom 可测）。Task 6/7 转场经 window.__rift 驱动这里的 setter。 */
export function createRiftState(effects: {
  breath: number;
  flashlight: boolean;
  intensity: number;
}) {
  const u: RiftUniforms = {
    t: 0,
    res: [1, 1],
    mouse: [0.5, 0.5],
    breath: effects.breath,
    flash: effects.flashlight ? 1 : 0,
    tear: 0,
    collapse: 0,
    shift: 0,
    time: 0,
  };
  let K = effects.intensity;
  return {
    u,
    /** 底噪呼吸直拨（绝对值）：挂载后热更新路径传 resolved effects.hum.breath，不再乘创建时快照 */
    setHum(v: number) {
      u.breath = v;
    },
    /** 手电开关（G3）：0/1 直拨 u.flash，FRAG 光斑项乘此值；热更新路径传 resolved effects.hum.flashlight */
    setFlash(on: boolean) {
      u.flash = on ? 1 : 0;
    },
    /** 烈度热更（riftIntensity 滑杆）：后续 tear/collapse/shift 按新 K 缩放，无需重挂层 */
    setIntensity(k: number) {
      K = k;
    },
    /** T1 撕合进度 0→1，按人格烈度缩放 */
    setTear(p: number) {
      u.tear = p * K;
    },
    /** T2 崩解进度 0→1，按人格烈度缩放（契约 v2 统一：所有转场量 × intensity） */
    setCollapse(p: number) {
      u.collapse = Math.min(1, Math.max(0, p)) * K;
    },
    /** 缝上 RGB 分离量，按烈度缩放 */
    setShift(v: number) {
      u.shift = v * K;
    },
  };
}

export type RiftState = ReturnType<typeof createRiftState>;

const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `precision mediump float;
uniform vec2 uRes; uniform vec2 uMouse; uniform float uDpr;
uniform float uBreath, uFlash, uTear, uCollapse, uShift, uTime;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  // 幕面呼吸：中央 8s 周期 ±1.5% 明暗
  float breath = (0.5 + 0.5 * sin(uTime * 0.785)) * 0.015 * uBreath;
  // 手电柔光：鼠标径向 300px 光斑
  float d = distance(uv * uRes, uMouse * uRes) / (300.0 * (uRes.x/1440.0));
  float light = exp(-d*d*3.0) * 0.028 * uBreath * uFlash;
  // 撕裂缝：对角带 + 缝上闪光与 RGB 抖
  float diag = uv.x + uv.y;
  float seam = smoothstep(0.02, 0.0, abs(diag - uTear * 2.2));
  vec3 col = vec3(0.027, 0.027, 0.039) + breath + light;
  col += seam * vec3(0.81, 0.89, 1.0) * (0.5 + 0.5*h(uv*100.0+uTime));
  col.r += seam * uShift * 0.35; col.b -= seam * uShift * 0.35;
  // 崩解：64 CSS px 块状噪声在 uCollapse 前后吞噬画面（uRes 是物理像素，除 uDpr 换算回 CSS 口径）
  vec2 blk = floor(uv * (uRes / (64.0 * uDpr)));
  float thr = h(blk) * 0.4 + uCollapse;
  if (thr > 1.0 && uCollapse > 0.0 && uCollapse < 1.0) col = mix(col, vec3(0.0), step(1.0, thr));
  gl_FragColor = vec4(col * (1.0 - uCollapse * 0.9), 1.0);
}`;

export interface RiftLayer {
  dispose(): void;
  gl: OGLRenderingContext;
}

/** 常驻全屏三角：rAF 循环把 state.u 刷进 uniforms；页面隐藏暂停渲染。仅浏览器端调用。 */
export function mountRift(
  canvas: HTMLCanvasElement,
  state: RiftState,
): RiftLayer {
  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio, 1.5),
    antialias: false,
  });
  const gl = renderer.gl;
  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uRes: { value: state.u.res },
      uMouse: { value: state.u.mouse },
      uDpr: { value: renderer.dpr }, // 一次性：创建后 dpr 变化不重编译（窗口跨屏拖拽属边缘场景）
      uBreath: { value: state.u.breath },
      uFlash: { value: state.u.flash },
      uTear: { value: state.u.tear },
      uCollapse: { value: state.u.collapse },
      uShift: { value: state.u.shift },
      uTime: { value: state.u.time },
    },
  });
  const mesh = new Mesh(gl, { geometry, program });

  let raf = 0;
  let hidden = false;
  const resize = () => {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    renderer.setSize(w, hgt); // ogl 1.0.11：无 resize()，setSize 按 dpr 乘出画布缓冲
    // gl_FragCoord 是帧缓冲物理像素，uRes 同坐标系对齐（uv 才能铺满 0–1）
    state.u.res[0] = w * renderer.dpr;
    state.u.res[1] = hgt * renderer.dpr;
  };
  const onMove = (e: MouseEvent) => {
    state.u.mouse[0] = e.clientX / window.innerWidth;
    state.u.mouse[1] = 1 - e.clientY / window.innerHeight;
  };
  const onVis = () => {
    hidden = document.hidden;
  };
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", onMove);
  document.addEventListener("visibilitychange", onVis);

  const t0 = performance.now();
  const loop = () => {
    if (!hidden) {
      const now = (performance.now() - t0) / 1000;
      state.u.time = now;
      program.uniforms.uTime.value = now;
      program.uniforms.uBreath.value = state.u.breath;
      program.uniforms.uFlash.value = state.u.flash;
      program.uniforms.uTear.value = state.u.tear;
      program.uniforms.uCollapse.value = state.u.collapse;
      program.uniforms.uShift.value = state.u.shift;
      renderer.render({ scene: mesh });
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    dispose() {
      // GL 上下文主动归还（数量有上限，反复重挂会撞顶）：放在解监听之前，确保无论
      // 后续步骤是否抛错都已释放。但只在画布节点已退役时 lose——deps 变化后原地
      // 重挂时 ogl 复用同一 context，此时 lose 会把新层打成白屏
      if (!canvas.isConnected) {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    },
    gl,
  };
}
