"use client";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Collapsible section primitive — designed for dense panels with many groups.
 * Header is clickable, chevron rotates, body animates height + opacity.
 *
 * Usage:
 *   <Section label="Pendant" defaultOpen right={<EnabledToggle/>}>
 *     <Slider .../>
 *   </Section>
 */
export function Section({
  label,
  right,
  defaultOpen = true,
  children,
  variant = "default",
}: {
  label: string;
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  variant?: "default" | "sub";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isSub = variant === "sub";
  return (
    <div
      className={
        isSub
          ? "mb-2 last:mb-0"
          : "mb-2.5 pb-2 border-b border-[color:var(--color-border-soft)] last:border-0 last:mb-0 last:pb-0"
      }
    >
      <div className="flex items-baseline justify-between mb-1.5 select-none">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 t-label hover:text-[color:var(--color-text)] transition-colors"
          aria-expanded={open}
        >
          <motion.svg
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
          >
            <path d="M2 1L5 4L2 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
          <span>{label}</span>
        </button>
        {right}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="pt-0.5 space-y-1.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
