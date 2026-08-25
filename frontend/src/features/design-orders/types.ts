import type { Customer } from "@/features/customers/types";

export type DesignOrderStatus =
  | "NEW"
  | "DESIGN_PREPARATION"
  | "CUTTING"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "CASH" | "PARTIAL" | "CREDIT" | "FULLY_PAID";

export interface DesignCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusHistory {
  id: string;
  from_status: DesignOrderStatus | null;
  to_status: DesignOrderStatus;
  note: string;
  changed_by_name: string;
  created_at: string;
}

export interface DesignOrderPayment {
  id: string;
  amount: string;
  payment_date: string;
  note: string;
  recorded_by_name: string;
  created_at: string;
}

export interface DesignOrder {
  id: string;
  order_number: string;
  customer: Pick<Customer, "id" | "customer_code" | "full_name" | "phone" | "whatsapp_number">;
  design_category: DesignCategory | null;
  design_name: string;
  design_description: string;
  customer_reference_image: string | null;
  design_preview_image: string | null;
  design_file_reference: string | null;
  design_file_name: string;
  design_file_type: string;
  cut_quantity: number;
  unit_price: string;
  total_amount: string;
  order_date: string;
  expected_delivery_date: string;
  actual_delivery_date: string | null;
  payment_due_date: string | null;
  status: DesignOrderStatus;
  payment_status: PaymentStatus;
  paid_amount: string;
  remaining_amount: string;
  design_type: "JAR" | "SIMPLE";
  color_count: "1" | "2";
  gemstone_size: number;
  baran_size_mm: string;
  notes: string;
  created_by_name?: string;
  status_history?: StatusHistory[];
  payment_history?: DesignOrderPayment[];
  created_at: string;
  updated_at?: string;
}

export interface DesignOrderInput {
  customer_id: string;
  design_name: string;
  design_description: string;
  cut_quantity: number;
  unit_price: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  status: DesignOrderStatus;
  design_type: "JAR" | "SIMPLE";
  color_count: "1" | "2";
  gemstone_size: number;
  baran_size_mm: number;
  order_date: string;
  expected_delivery_date: string;
  notes: string;
}

export interface DesignOrderListParams {
  search?: string;
  status?: DesignOrderStatus | "";
  customer_id?: string;
  category_id?: string;
  order_date_from?: string;
  order_date_to?: string;
  payment_filter?: "outstanding" | "partial" | "credit" | "settled" | "";
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface DesignOrderPage {
  data: DesignOrder[];
  meta: {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
}

export interface OverdueDebtReminder {
  order_id: string;
  order_number: string;
  customer_name: string;
  remaining_amount: string;
  payment_due_date: string;
  whatsapp_allowed: boolean;
  whatsapp_url: string | null;
  message: string;
}
