import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge("skeleton-shimmer overflow-hidden rounded-xl bg-slate-200", className)} {...props} />;
}
