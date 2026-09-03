import type { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:bg-brand-700 hover:shadow-md active:translate-y-px active:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={twMerge(primaryButtonClass, className)}
      {...props}
    />
  );
}

export const Button = PrimaryButton;
