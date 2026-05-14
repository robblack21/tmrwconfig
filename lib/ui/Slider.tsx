"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "./cn";

export type SliderProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  format?: (n: number) => string;
  ticks?: number[];
  className?: string;
};

export function Slider({
  label, value, onChange, min, max, step = 0.5, unit, format, ticks, className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const valuePct = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);
  const snap = useCallback((raw: number) => Math.round(raw / step) * step, [step]);

  const setFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const raw = min + pct * (max - min);
    onChange(Math.min(Math.max(snap(raw), min), max));
  }, [min, max, snap, onChange]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const fineStep = e.shiftKey ? step * 10 : step;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(snap(value - fineStep), min));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(snap(value + fineStep), max));
    } else if (e.key === "Home") onChange(min);
    else if (e.key === "End") onChange(max);
  };

  const displayValue = format ? format(value) : `${value.toFixed(step < 1 ? 1 : 0)}${unit ? unit : ""}`;

  return (
    <div className={cn("flex items-center gap-2 h-6", className)}>
      <span className="t-label w-[68px] flex-shrink-0 truncate">{label}</span>

      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKey}
        className="relative flex-1 h-6 cursor-pointer outline-none"
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full neumorph-inset" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-[color:var(--color-accent)]/80"
          style={{ width: `calc(${valuePct}% + 1px)` }}
        />
        {ticks?.map((t) => {
          const pct = ((t - min) / (max - min)) * 100;
          return (
            <div
              key={t}
              className="absolute top-1/2 -translate-y-1/2 w-px h-[6px] bg-[color:var(--color-text-soft)]/40"
              style={{ left: `${pct}%` }}
            />
          );
        })}
        <motion.div
          animate={{ left: `calc(${valuePct}% - 7px)` }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full neumorph-raised",
            dragging && "ring-2 ring-[color:var(--color-accent)]/30"
          )}
        >
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-[4px] h-[4px] rounded-full bg-[color:var(--color-accent)]" />
          </div>
        </motion.div>
      </div>

      <span className="t-num w-[44px] text-right flex-shrink-0">{displayValue}</span>
    </div>
  );
}
