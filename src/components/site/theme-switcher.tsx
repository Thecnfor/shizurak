"use client";

import * as Popover from "@radix-ui/react-popover";
import * as Slider from "@radix-ui/react-slider";
import { Palette } from "lucide-react";
import { useState } from "react";
import { withThemeViewTransition } from "@/lib/motion/vt";
import { useThemeStore } from "@/stores/theme-store";
import { themeList } from "@/themes/registry";

function LabeledSlider({
  label,
  display,
  min,
  max,
  step,
  value,
  onValueChange,
}: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (v: number) => void;
}) {
  return (
    <div className="block text-xs text-ink-muted">
      {label} · {display}
      <Slider.Root
        className="relative mt-1 flex h-4 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-surface-hover">
          <Slider.Range className="absolute h-full rounded-full bg-accent" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={label}
          className="block size-3 rounded-full bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        />
      </Slider.Root>
    </div>
  );
}

export function ThemeSwitcher({ labels }: { labels: Record<string, string> }) {
  const {
    themeId,
    modeChoice,
    overrides,
    resolved,
    setTheme,
    setMode,
    setOverride,
  } = useThemeStore();
  const [open, setOpen] = useState(false);
  const multiMode = resolved.meta.modes.length > 1;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={labels.switcher}
        className="flex size-8 items-center justify-center rounded-sm text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-accent"
      >
        <Palette className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 w-72 rounded-md border border-border bg-bg-elevated p-4 shadow-[var(--shadow-md)]"
        >
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
            {labels.switcher}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {themeList.map((t) => (
              <button
                key={t.meta.id}
                type="button"
                onClick={() =>
                  withThemeViewTransition(() => setTheme(t.meta.id))
                }
                data-active={t.meta.id === themeId}
                className="flex items-center gap-2 rounded-sm border border-border p-2 text-left text-sm data-[active=true]:border-border-strong data-[active=true]:text-ink"
              >
                <span
                  aria-hidden
                  className="size-4 rounded-full border border-border"
                  style={{ background: t.meta.preview.accent }}
                />
                <span>
                  {t.meta.name}
                  <span className="block text-xs text-ink-muted">
                    {t.meta.nameEn}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {multiMode && (
            <div className="mt-4">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">
                {labels.mode}
              </p>
              <div className="flex gap-1">
                {(["light", "dark", "system"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    data-active={modeChoice === m}
                    className="flex-1 rounded-sm border border-border px-2 py-1 text-xs text-ink-muted data-[active=true]:border-border-strong data-[active=true]:text-ink"
                  >
                    {labels[m]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              {labels.customize}
            </p>
            <LabeledSlider
              label={labels.hum}
              display={(overrides.hum ?? 1).toFixed(1)}
              min={0}
              max={1}
              step={0.1}
              value={overrides.hum ?? 1}
              onValueChange={(v) => setOverride("hum", v)}
            />
            <LabeledSlider
              label={labels.rift}
              display={(
                overrides.riftIntensity ?? resolved.effects.rift.intensity
              ).toFixed(1)}
              min={0}
              max={1}
              step={0.1}
              value={overrides.riftIntensity ?? resolved.effects.rift.intensity}
              onValueChange={(v) => setOverride("riftIntensity", v)}
            />
            <LabeledSlider
              label={labels.motionSpeed}
              display={`${(overrides.motionSpeed ?? 1).toFixed(1)}×`}
              min={0.5}
              max={2}
              step={0.1}
              value={overrides.motionSpeed ?? 1}
              onValueChange={(v) => setOverride("motionSpeed", v)}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
