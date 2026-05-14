"use client";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Mounts a fullscreen overlay above the canvas that fades from solid surface
 * colour to transparent over `duration` ms, giving the scene an alpha fade-in.
 * Sits at z-40 (below UI overlays at z-50 so the panels stay visible).
 */
export function SceneLoadingOverlay({ duration = 1200 }: { duration?: number }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHidden(true), duration + 50);
    return () => clearTimeout(t);
  }, [duration]);
  if (hidden) return null;
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: duration / 1000, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0"
      style={{ background: "var(--color-bg)", zIndex: 40 }}
    />
  );
}

/**
 * Renders nothing for `delay` ms, then renders children. Used inside R3F
 * trees to stagger major component appearance.
 */
export function TimedReveal({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const [show, setShow] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!show) return null;
  return <>{children}</>;
}
