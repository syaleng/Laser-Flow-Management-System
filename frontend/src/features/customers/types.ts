export interface Customer {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  whatsapp_number: string;
  whatsapp_consent: boolean;
  whatsapp_consent_at: string | null;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  full_name: string;
  phone: string;
  whatsapp_number: string;
  whatsapp_consent: boolean;
  address: string;
  notes: string;
}

export interface CustomerListParams {
  search?: string;
  is_active?: "true" | "false" | "";
  whatsapp_consent?: "true" | "false" | "";
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PageMeta {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

export interface CustomerPage {
  data: Customer[];
  meta: PageMeta;
}

