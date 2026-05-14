"use client";
import { motion } from "framer-motion";
import { cn } from "./cn";

type Variant = "primary" | "ghost" | "subtle";
type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  sm: "h-7 px-3 text-[0.72rem]",
  md: "h-9 px-4 text-[0.82rem]",
  lg: "h-11 px-5 text-[0.92rem]",
};

const variantMap: Record<Variant, string> = {
  primary:
    "neumorph-raised hover:brightness-110 active:brightness-95 active:[box-shadow:inset_3px_3px_6px_var(--color-hi-shadow),inset_-2px_-2px_4px_var(--color-hi-light)]",
  ghost:
    "bg-transparent hover:bg-[color:var(--color-surface)]/40 text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]",
  subtle:
    "neumorph-inset text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[12px] font-display tracking-wide whitespace-nowrap select-none transition-[filter,box-shadow] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        sizeMap[size],
        variantMap[variant],
        className
      )}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
