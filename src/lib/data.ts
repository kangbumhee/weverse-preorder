import { Product } from "./types";

const SEOUL: Intl.DateTimeFormatOptions = { timeZone: "Asia/Seoul" };

/** 서버/클라이언트 동일 출력 (hydration 안전) */
export function getUpdatedAtString(updatedAt: string): string {
  try {
    const d = new Date(updatedAt);
    if (Number.isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("ko-KR", {
      ...SEOUL,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    if (!y || !m || !day || hour === undefined || minute === undefined) return "";
    return `${y}.${m}.${day} ${hour.padStart(2, "0")}:${minute.padStart(2, "0")} 기준`;
  } catch {
    return "";
  }
}

export function formatKoLongDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      ...SEOUL,
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function formatKoMonthDay(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      ...SEOUL,
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function getMaxOrderQuantity(product: Product): number | null {
  if (product.detail?.goodsOrderLimit?.maxOrderQuantity) {
    return product.detail.goodsOrderLimit.maxOrderQuantity;
  }
  const opts = product.detail?.option?.options;
  if (opts && opts.length > 0) {
    const limits = opts
      .map((o) => o.optionOrderLimit?.maxOrderQuantity)
      .filter((n): n is number => n !== undefined);
    if (limits.length > 0) return Math.min(...limits);
  }
  return null;
}

export function formatPrice(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "미정";
  const dt = new Date(d);
  const wk = ["일", "월", "화", "수", "목", "금", "토"];
  return `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()} (${wk[dt.getDay()]})`;
}

export function getDdayNumber(d: string | null | undefined): number | null {
  if (!d) return null;
  const now = new Date();
  const target = new Date(d);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getLimitColor(qty: number | null): string {
  if (qty === null) return "";
  if (qty <= 1) return "bg-red-500 text-white";
  if (qty <= 3) return "bg-orange-500 text-white";
  if (qty <= 10) return "bg-yellow-500 text-black";
  return "bg-gray-400 text-white";
}

export function sortByDeliveryDate(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const dateA = a.detail?.preOrder?.deliveryStartAt || a.deliveryDate || "9999";
    const dateB = b.detail?.preOrder?.deliveryStartAt || b.deliveryDate || "9999";
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
}
