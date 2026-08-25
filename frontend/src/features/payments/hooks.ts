import { useQuery } from "@tanstack/react-query";

import { getPayments } from "./api";

export const paymentKeys = {
  all: ["payments"] as const,
  list: (search: string, page: number) => ["payments", "list", search, page] as const,
};

export function usePayments(search: string, page: number) {
  return useQuery({
    queryKey: paymentKeys.list(search, page),
    queryFn: () => getPayments({ search, page }),
  });
}
