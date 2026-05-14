import { cn } from "./cn";

type Variant = "raised" | "inset" | "glass" | "panel";
type Radius = "sm" | "md" | "lg";

const radiusMap: Record<Radius, string> = {
  sm: "rounded-[6px]",
  md: "rounded-[12px]",
  lg: "rounded-[24px]",
};
const variantMap: Record<Variant, string> = {
  raised: "neumorph-raised",
  inset: "neumorph-inset",
  glass: "neumorph-glass",
  panel: "panel-glass",
};

export function Card({
  variant = "raised",
  radius = "lg",
  className,
  children,
  ...rest
}: {
  variant?: Variant;
  radius?: Radius;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(variantMap[variant], radiusMap[radius], className)} {...rest}>
      {children}
    </div>
  );
}
