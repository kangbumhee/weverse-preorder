"use client";

import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import Image from "next/image";
import { useWeverseData } from "@/components/WeverseDataProvider";
import { getMaxOrderQuantity } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import FilterBar from "@/components/FilterBar";

export default function ArtistPage() {
  const params = useParams();
  const artistId = Number(params.artistId);
  const { artists, products: allProducts } = useWeverseData();

  const artist = useMemo(
    () => artists.find((a) => a.artistId === artistId),
    [artists, artistId]
  );

  const products = useMemo(
    () => allProducts.filter((p) => p.artistId === artistId),
    [allProducts, artistId]
  );

  const [filter, setFilter] = useState("all");

  const categories = useMemo(() => {
    const cats: Record<string, number> = {};
    products.forEach((p) => {
      cats[p.category] = (cats[p.category] || 0) + 1;
    });
    return cats;
  }, [products]);

  const saleCount = products.filter((p) => p.status === "SALE").length;
  const soldOutCount = products.filter((p) => p.status === "SOLD_OUT").length;
  const toBeSoldCount = products.filter((p) => p.status === "TO_BE_SOLD").length;

  const filters = [
    { key: "all", label: "전체", count: products.length },
    { key: "sale", label: "구매가능", count: saleCount },
    { key: "soldout", label: "품절", count: soldOutCount },
    ...(toBeSoldCount > 0
      ? [{ key: "tobesold", label: "판매예정", count: toBeSoldCount }]
      : []),
    ...Object.entries(categories).map(([cat, cnt]) => ({
      key: `cat:${cat}`,
      label: cat,
      count: cnt,
    })),
    {
      key: "limit:low",
      label: "제한 1~3개",
      count: products.filter((p) => {
        const q = getMaxOrderQuantity(p);
        return q !== null && q <= 3;
      }).length,
    },
  ];

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filter === "all") return true;
      if (filter === "sale") return p.status === "SALE";
      if (filter === "soldout") return p.status === "SOLD_OUT";
      if (filter === "tobesold") return p.status === "TO_BE_SOLD";
      if (filter.startsWith("cat:")) return p.category === filter.slice(4);
      if (filter === "limit:low") {
        const q = getMaxOrderQuantity(p);
        return q !== null && q <= 3;
      }
      return true;
    });
  }, [products, filter]);

  if (!artist)
    return (
      <div className="text-center py-20 text-gray-500">
        아티스트를 찾을 수 없습니다.
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 shrink-0">
          <Image
            src={artist.logoImageUrl}
            alt={artist.shortName}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">
            {artist.name}
          </h1>
          <p className="text-sm text-gray-500">
            예약판매 {products.length}개 · 구매가능 {saleCount}개 · 품절{" "}
            {soldOutCount}개
          </p>
        </div>
      </div>

      <FilterBar filters={filters} onFilter={setFilter} activeFilter={filter} />

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          해당 조건의 상품이 없습니다.
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
