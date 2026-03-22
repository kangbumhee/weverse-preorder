"use client";

import Image from "next/image";
import { Product } from "@/lib/types";
import {
  formatPrice,
  formatKoLongDate,
  formatKoMonthDay,
  getMaxOrderQuantity,
  getLimitColor,
} from "@/lib/data";

export default function ProductCard({ product }: { product: Product }) {
  const p = product;
  const isSoldOut = p.status === "SOLD_OUT";
  const isToBeSold = p.status === "TO_BE_SOLD";
  const detail = p.detail;
  const gol = detail?.goodsOrderLimit;
  const po = detail?.preOrder;
  const ship = detail?.shipping?.shippingCountry;
  const sp = ship?.shippingPolicy;
  const opts = detail?.option?.options || [];
  const earnedCash = detail?.earnedCash ?? 0;
  const maxQty = getMaxOrderQuantity(p);
  const limitColor = getLimitColor(maxQty);
  const productUrl = `https://shop.weverse.io/shop/KRW/artists/${p.artistId}/sales/${p.saleId}`;

  const icons = Array.isArray(p.icons) ? p.icons : [];
  const emblems = Array.isArray(p.emblems) ? p.emblems : [];
  const price = p.price;

  const startLabel = po?.deliveryStartAt ? formatKoLongDate(po.deliveryStartAt) : "";
  const endLabel = po?.deliveryEndAt ? formatKoMonthDay(po.deliveryEndAt) : "";
  const saleStartLabel = detail?.saleStartAt ? formatKoLongDate(detail.saleStartAt) : "";

  return (
    <a
      href={productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
        isSoldOut ? "opacity-60 hover:opacity-85" : ""
      }`}
    >
      <div className="relative aspect-square bg-gray-50">
        {p.thumbnailImageUrl && (
          <Image
            src={p.thumbnailImageUrl}
            alt={p.name}
            fill
            className="object-cover"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          />
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <span className="bg-black text-white px-5 py-2 rounded-lg text-sm font-extrabold tracking-wider">
              SOLD OUT
            </span>
          </div>
        )}
        {isToBeSold && (
          <div className="absolute inset-0 bg-purple-900/30 flex items-center justify-center z-10">
            <span className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold">
              판매 예정
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-20">
          {p.status === "SALE" && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500 text-white">
              구매가능
            </span>
          )}
          {p.status === "SOLD_OUT" && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500 text-white">
              품절
            </span>
          )}
          {p.status === "TO_BE_SOLD" && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500 text-white">
              판매예정
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">
            예약판매
          </span>
          {icons.includes("ONLY") && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
              단독
            </span>
          )}
          {icons.includes("BENEFIT") && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">
              특전
            </span>
          )}
          {emblems.includes("FAN_EVENT") && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500 text-white">
              팬이벤트
            </span>
          )}
        </div>
        {maxQty !== null && (
          <div className="absolute top-2 right-2 z-20">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${limitColor}`}>
              최대 {maxQty}개
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wide">
          {p.artistShortName} · {p.category}
        </p>
        <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-2 min-h-[40px]">
          {p.name}
        </h3>
        {price && (
          <div className="flex items-baseline gap-1.5 mt-2">
            {price.discountPercent > 0 && (
              <span className="text-xs font-bold text-red-500">{price.discountPercent}%</span>
            )}
            <span className="text-base font-extrabold">{formatPrice(price.salePrice)}원</span>
            {price.discountPercent > 0 && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(price.originalPrice)}원</span>
            )}
          </div>
        )}
        <div className="mt-3 space-y-1.5">
          {gol && (
            <div className="flex gap-2 text-[11px]">
              <span className="bg-gray-100 rounded px-1.5 py-0.5">
                구매제한 <strong className="text-red-600">{gol.maxOrderQuantity}개</strong>
              </span>
              <span className="bg-gray-100 rounded px-1.5 py-0.5">
                가능 <strong className={gol.availableQuantity > 0 ? "text-green-600" : "text-red-600"}>{gol.availableQuantity}개</strong>
              </span>
            </div>
          )}
          {!gol && maxQty !== null && (
            <div className="text-[11px]">
              <span className="bg-gray-100 rounded px-1.5 py-0.5">
                옵션당 최대 <strong className="text-red-600">{maxQty}개</strong>
              </span>
            </div>
          )}
          {startLabel && (
            <p className="text-xs text-gray-500">
              출고예정: {startLabel}
              {endLabel && <> ~ {endLabel}</>}
            </p>
          )}
          {saleStartLabel && (
            <p className="text-xs text-gray-400 mt-0.5">
              판매시작: {saleStartLabel}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-500">
            {earnedCash > 0 && (
              <span className="text-purple-600 font-semibold">적립 {formatPrice(earnedCash)}C</span>
            )}
            {sp && (
              <span>배송 {formatPrice(sp.minShippingCost.cost)}원 ({formatPrice(sp.freeShippingCost.cost)}원↑무료)</span>
            )}
          </div>
          {opts.length > 1 && (
            <div className="mt-2 border-t pt-2">
              <p className="text-[10px] text-gray-400 font-semibold mb-1">옵션 ({opts.length})</p>
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {opts.map((opt, i) => (
                  <div key={i} className="flex justify-between text-[10px] px-1">
                    <span className={`truncate mr-2 ${opt.isSoldOut ? "line-through text-gray-300" : "text-gray-700"}`}>
                      {opt.saleOptionName}
                    </span>
                    <span className={`shrink-0 font-bold ${opt.isSoldOut ? "text-red-400" : "text-green-500"}`}>
                      {opt.isSoldOut ? "품절" : "가능"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
