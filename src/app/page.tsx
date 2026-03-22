"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getArtists, getProductCountByArtist, getUpdatedAtString, getProducts } from "@/lib/data";

export default function HomePage() {
  const artists = getArtists();
  const products = getProducts();
  const updatedAt = getUpdatedAtString();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return artists;
    const q = search.toLowerCase();
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q)
    );
  }, [search, artists]);

  const totalProducts = products.length;
  const saleProducts = products.filter((p) => p.status === "SALE").length;
  const soldOutProducts = products.filter((p) => p.status === "SOLD_OUT").length;
  const artistsWithProducts = artists.filter(
    (a) => getProductCountByArtist(a.artistId) > 0
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 통계 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Weverse Shop 예약판매
        </h1>
        <p className="text-sm text-gray-500 mt-1">{updatedAt}</p>
        <div className="flex justify-center gap-4 mt-4">
          <div className="bg-purple-50 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-extrabold text-purple-600">{totalProducts}</p>
            <p className="text-[10px] text-gray-500">전체 상품</p>
          </div>
          <div className="bg-green-50 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-extrabold text-green-600">{saleProducts}</p>
            <p className="text-[10px] text-gray-500">구매 가능</p>
          </div>
          <div className="bg-red-50 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-extrabold text-red-500">{soldOutProducts}</p>
            <p className="text-[10px] text-gray-500">품절</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-extrabold text-gray-700">{artistsWithProducts}</p>
            <p className="text-[10px] text-gray-500">아티스트</p>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="아티스트 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md mx-auto block px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {/* 아티스트 그리드 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filtered.map((artist) => {
          const count = getProductCountByArtist(artist.artistId);
          return (
            <Link
              key={artist.artistId}
              href={`/artist/${artist.artistId}`}
              className={`bg-white rounded-xl p-3 text-center hover:shadow-lg transition-all hover:-translate-y-1 ${
                count === 0 ? "opacity-40" : ""
              }`}
            >
              <div className="relative w-14 h-14 mx-auto rounded-full overflow-hidden bg-gray-100">
                <Image
                  src={artist.logoImageUrl}
                  alt={artist.shortName}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <p className="text-xs font-bold text-gray-800 mt-2 truncate">
                {artist.shortName}
              </p>
              {count > 0 && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                  {count}개
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
