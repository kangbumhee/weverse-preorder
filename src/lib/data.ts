import { WeverseData, Product, Artist } from "./types";

let cachedData: WeverseData | null = null;

function loadData(): WeverseData {
  if (cachedData) return cachedData;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("../../public/data/weverse-preorder-data.json");
    cachedData = raw as WeverseData;
    return cachedData;
  } catch {
    cachedData = { updatedAt: new Date().toISOString(), artists: [], products: [] };
    return cachedData;
  }
}

export function getAllData(): WeverseData {
  return loadData();
}

export function getArtists(): Artist[] {
  return loadData().artists;
}

export function getProducts(): Product[] {
  return loadData().products;
}

export function getArtistById(artistId: number): Artist | undefined {
  return loadData().artists.find((a) => a.artistId === artistId);
}

export function getProductsByArtist(artistId: number): Product[] {
  return loadData().products.filter((p) => p.artistId === artistId);
}

export function getProductCountByArtist(artistId: number): number {
  return loadData().products.filter((p) => p.artistId === artistId).length;
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

// D-day는 클라이언트에서만 계산 (hydration 불일치 방지)
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

export function getUpdatedAtString(): string {
  const dt = new Date(loadData().updatedAt);
  return `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")} 기준`;
}

// 출고일 기준 정렬 (D-day 임박순)
export function sortByDeliveryDate(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const dateA = a.detail?.preOrder?.deliveryStartAt || a.deliveryDate || "9999";
    const dateB = b.detail?.preOrder?.deliveryStartAt || b.deliveryDate || "9999";
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
}
