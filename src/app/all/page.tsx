"use client";

import { useState, useMemo } from "react";
import { useWeverseData } from "@/components/WeverseDataProvider";
import {
  getMaxOrderQuantity,
  getUpdatedAtString,
  sortByDDayProximity,
} from "@/lib/data";
import ProductCard from "@/components/ProductCard";

export default function AllPage() {
  const { artists, products, updatedAt } = useWeverseData();
  const updatedAtLabel = getUpdatedAtString(updatedAt);
  const [statusFilter, setStatusFilter] = useState("all");
  const [artistFilter, setArtistFilter] = useState("all");
  const [sort, setSort] = useState("dday");
  const [search, setSearch] = useState("");

  const artistsWithProducts = useMemo(() => {
    const ids = new Set(products.map((p) => p.artistId));
    return artists.filter((a) => ids.has(a.artistId));
  }, [products, artists]);

  const filtered = useMemo(() => {
    let list = [...products];

    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);

    if (artistFilter !== "all") list = list.filter((p) => p.artistId === Number(artistFilter));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.artistName.toLowerCase().includes(q)
      );
    }

    if (sort === "dday") list = sortByDDayProximity(list);
    else if (sort === "price_low") list.sort((a, b) => a.price.salePrice - b.price.salePrice);
    else if (sort === "price_high") list.sort((a, b) => b.price.salePrice - a.price.salePrice);
    else if (sort === "limit_low")
      list.sort((a, b) => {
        const aq = getMaxOrderQuantity(a) ?? 999;
        const bq = getMaxOrderQuantity(b) ?? 999;
        return aq - bq;
      });

    return list;
  }, [products, statusFilter, artistFilter, sort, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold text-gray-900">전체 예약판매 상품</h1>
      <p className="text-sm text-gray-500">{updatedAtLabel} · 총 {products.length}개</p>

      <div className="flex flex-wrap gap-2 mt-4 items-center">
        <input
          type="text"
          placeholder="상품 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs w-48 focus:outline-none focus:border-purple-500"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border text-xs">
          <option value="all">전체 상태</option>
          <option value="SALE">구매 가능</option>
          <option value="TO_BE_SOLD">판매예정</option>
          <option value="SOLD_OUT">품절</option>
        </select>
        <select value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border text-xs">
          <option value="all">전체 아티스트</option>
          {artistsWithProducts.map((a) => (
            <option key={a.artistId} value={a.artistId}>{a.shortName}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-1.5 rounded-lg border text-xs">
          <option value="dday">출고일 임박순</option>
          <option value="latest">기본 순서</option>
          <option value="price_low">가격 낮은순</option>
          <option value="price_high">가격 높은순</option>
          <option value="limit_low">구매제한 적은순</option>
        </select>
      </div>

      <p className="text-xs text-gray-400 mt-3">{filtered.length}개 상품</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        {filtered.map((product) => (
          <ProductCard key={product.saleId} product={product} />
        ))}
      </div>
    </div>
  );
}
