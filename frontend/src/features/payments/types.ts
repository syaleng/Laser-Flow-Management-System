export interface Payment {
  id: string;
  amount: string;
  payment_date: string;
  note: string;
  recorded_by_name: string;
  order_number: string;
  design_name: string;
  customer_name: string;
  created_at: string;
}

export interface PaymentPage {
  data: Payment[];
  meta: {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
}
