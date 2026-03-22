"use client";

import { useState, useMemo, useCallback } from "react";
import {
  getProducts,
  getMaxOrderQuantity,
  getUpdatedAtString,
  sortByDeliveryDate,
} from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import RangeSlider from "@/components/RangeSlider";

const PRESETS = [
  { label: "1개만", min: 1, max: 1 },
  { label: "1~3개", min: 1, max: 3 },
  { label: "1~5개", min: 1, max: 5 },
  { label: "1~10개", min: 1, max: 10 },
  { label: "전체", min: 1, max: 50 },
];

export default function LimitedPage() {
  const allProducts = getProducts();
  const updatedAt = getUpdatedAtString();
  const [statusFilter, setStatusFilter] = useState("all");

  // 구매제한 범위
  const limitedProducts = useMemo(() => {
    return allProducts
      .map((p) => ({ product: p, maxQty: getMaxOrderQuantity(p) }))
      .filter((item) => item.maxQty !== null);
  }, [allProducts]);

  const maxLimit = useMemo(() => {
    let m = 1;
    limitedProducts.forEach((item) => {
      if (item.maxQty && item.maxQty > m) m = item.maxQty;
    });
    return m;
  }, [limitedProducts]);

  const [rangeMin, setRangeMin] = useState(1);
  const [rangeMax, setRangeMax] = useState(maxLimit);

  const handleRangeChange = useCallback((newMin: number, newMax: number) => {
    setRangeMin(newMin);
    setRangeMax(newMax);
  }, []);

  const applyPreset = (preset: { min: number; max: number }) => {
    setRangeMin(preset.min);
    setRangeMax(Math.min(preset.max, maxLimit));
  };

  const filtered = useMemo(() => {
    let list = limitedProducts.filter(
      (item) => item.maxQty !== null && item.maxQty >= rangeMin && item.maxQty <= rangeMax
    );

    if (statusFilter === "sale")
      list = list.filter((item) => item.product.status === "SALE");
    else if (statusFilter === "soldout")
      list = list.filter((item) => item.product.status === "SOLD_OUT");

    return sortByDeliveryDate(list.map((item) => item.product));
  }, [limitedProducts, rangeMin, rangeMax, statusFilter]);

  // 범위별 개수 계산
  const rangeCount = useMemo(() => {
    let count = 0;
    limitedProducts.forEach((item) => {
      if (item.maxQty !== null && item.maxQty >= rangeMin && item.maxQty <= rangeMax) count++;
    });
    return count;
  }, [limitedProducts, rangeMin, rangeMax]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold text-gray-900">구매제한 상품</h1>
      <p className="text-sm text-gray-500">
        {updatedAt} · 구매제한 있는 상품 {limitedProducts.length}개 · 출고일 임박순
      </p>

      {/* 슬라이더 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mt-4">
        <p className="text-xs font-semibold text-gray-700 mb-1">
          구매제한 수량 범위: <span className="text-purple-600">{rangeMin}개 ~ {rangeMax}개</span>
          <span className="text-gray-400 ml-2">({rangeCount}개 상품)</span>
        </p>
        <RangeSlider
          min={1}
          max={maxLimit}
          valueMin={rangeMin}
          valueMax={rangeMax}
          onChange={handleRangeChange}
        />

        {/* 프리셋 버튼 */}
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESETS.map((preset) => {
            const isActive = rangeMin === preset.min && rangeMax === Math.min(preset.max, maxLimit);
            return (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  isActive
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-400 hover:text-purple-600"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 mt-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs"
        >
          <option value="all">전체 상태</option>
          <option value="sale">구매 가능</option>
          <option value="soldout">품절</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length}개 상품 · 출고일 임박순</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          해당 범위의 상품이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {filtered.map((product) => (
            <ProductCard key={product.saleId} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
