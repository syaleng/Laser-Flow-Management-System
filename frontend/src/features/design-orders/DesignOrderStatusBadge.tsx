import { statusLabels, statusStyles } from "./status";
import type { DesignOrderStatus } from "./types";

export function DesignOrderStatusBadge({ status }: { status: DesignOrderStatus }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${statusStyles[status]}`}>{statusLabels[status]}</span>;
}
