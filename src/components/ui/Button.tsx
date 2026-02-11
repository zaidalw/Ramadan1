import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:translate-y-px disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]";

const variants: Record<Variant, string> = {
  primary:
    "bg-[color:var(--gold)] text-[#102117] shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:brightness-[1.02]",
  secondary:
    "bg-[color:var(--surface-2)] text-[color:var(--foreground)] border border-white/10 hover:bg-white/10",
  ghost: "bg-transparent text-[color:var(--foreground)] hover:bg-white/10",
  danger: "bg-[color:var(--danger)] text-white hover:brightness-[1.02]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", fullWidth, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
});

