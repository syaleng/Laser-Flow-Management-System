import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={twMerge("page-header", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions print:hidden">{actions}</div>}
    </header>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={twMerge("surface-panel", className)}>{children}</section>;
}

export function StatePanel({
  title,
  detail,
  action,
  className,
}: {
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={twMerge("state-panel", className)}>
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
      {detail && <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
