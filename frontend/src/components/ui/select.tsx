import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type SelectContextValue = { value?: string; onValueChange?: (value: string) => void; open: boolean; setOpen: (open: boolean) => void };
const SelectContext = createContext<SelectContextValue | null>(null);
const useSelect = () => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("Select components must be used inside Select.");
  return context;
};

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}><div className="relative">{children}</div></SelectContext.Provider>;
}

export function SelectTrigger({ className, children }: { className?: string; children: ReactNode }) {
  const { open, setOpen } = useSelect();
  return <button type="button" className={twMerge("flex h-10 items-center justify-between rounded-md border px-3 text-sm", className)} onClick={() => setOpen(!open)}>{children}</button>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelect();
  return <span>{value ?? placeholder}</span>;
}

export function SelectContent({ className, children }: { className?: string; children: ReactNode }) {
  const { open } = useSelect();
  return open ? <div className={twMerge("absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10", className)}>{children}</div> : null;
}

export function SelectItem({ value, className, children, ...props }: { value: string; className?: string; children: ReactNode } & HTMLAttributes<HTMLButtonElement>) {
  const { onValueChange, setOpen } = useSelect();
  return <button type="button" className={twMerge("block w-full rounded-lg px-3 py-2.5 text-right text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-800", className)} onClick={() => { onValueChange?.(value); setOpen(false); }} {...props}>{children}</button>;
}
