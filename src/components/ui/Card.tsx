import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[color:var(--surface)]/85 shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

