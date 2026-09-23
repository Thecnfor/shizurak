"use client";

import type { Kernel } from "@/kernel/core";

/**
 * 内核懒启动（T10 补记 size 削减）：cordis + zod + catalog 图不再静态进首载。
 * 触发点＝真实消费信号：⌘K 首开 / agent dock 首开（chat attempt 随dock）/
 * GenUI 渲染器挂载。启动失败不缓存（下次触发可重试），与 whenClientKernelReady
 * 自身的「失败不缓存」语义同构。
 */

type Wiring = (k: Kernel) => void;

let bootPromise: Promise<Kernel> | null = null;
const wirings = new Set<Wiring>();

export function ensureClientKernel(): Promise<Kernel> {
  if (!bootPromise) {
    bootPromise = import("./index")
      .then((m) => m.whenClientKernelReady())
      .then(async (k) => {
        for (const w of wirings) await w(k);
        return k;
      })
      .catch((err: unknown) => {
        bootPromise = null; // 失败不缓存：下一次交互重试
        throw err;
      });
  }
  return bootPromise;
}

/** 已启动则拿到就绪 Promise；未激活返回 null（调用方据此不拉内核 chunk）。 */
export function bootedClientKernel(): Promise<Kernel> | null {
  return bootPromise;
}

/**
 * 注册启动后接线（基线 ui-actions 注册、page-context 补推等，见 ClientKernelShell）。
 * 启动尚未发生时只入册；已在飞/已启动则补执行一次。回调须幂等（内核单例跨
 * pathname 效应重挂可能二次触达）。返回取消函数。
 */
export function wireOnClientKernel(w: Wiring): () => void {
  wirings.add(w);
  if (bootPromise) void bootPromise.then(w, () => {});
  return () => {
    wirings.delete(w);
  };
}
