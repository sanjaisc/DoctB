import { format, parseISO } from "date-fns";

export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "MMM d, yyyy");
}

export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function fmtCurrency(cents: number | null | undefined): string {
  if (cents == null) return "$0.00";
  return currencyFmt.format(cents / 100);
}
