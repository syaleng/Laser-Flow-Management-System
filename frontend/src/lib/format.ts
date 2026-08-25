export function formatAfn(value: string | number): string {
  const amount = Number(value);
  return `${Number.isFinite(amount) ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"} AFN`;
}

export const paymentMethodLabels: Record<string, string> = {
  CASH: "نغدي",
  BANK: "بانکي",
  OTHER: "نور",
};
