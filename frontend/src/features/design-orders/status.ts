import type { DesignOrderStatus } from "./types";

export const statusLabels: Record<DesignOrderStatus, string> = {
  NEW: "نوی",
  DESIGN_PREPARATION: "کار روان دی",
  CUTTING: "پرې کول روان دي",
  READY_FOR_DELIVERY: "بشپړ شوی",
  DELIVERED: "مشتري ته سپارل شوی",
  CANCELLED: "لغوه شوی",
};

export const statusStyles: Record<DesignOrderStatus, string> = {
  NEW: "border border-blue-200 bg-blue-50 text-blue-700",
  DESIGN_PREPARATION: "border border-violet-200 bg-violet-50 text-violet-700",
  CUTTING: "border border-amber-200 bg-amber-50 text-amber-700",
  READY_FOR_DELIVERY: "border border-cyan-200 bg-cyan-50 text-cyan-700",
  DELIVERED: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border border-red-200 bg-red-50 text-red-700",
};

export const nextStatuses: Record<DesignOrderStatus, DesignOrderStatus[]> = {
  NEW: ["DESIGN_PREPARATION", "CANCELLED"],
  DESIGN_PREPARATION: ["CUTTING", "CANCELLED"],
  CUTTING: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};
