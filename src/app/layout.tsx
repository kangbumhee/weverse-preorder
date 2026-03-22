import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { loadWeverseData } from "@/lib/load-weverse-data";
import { WeverseDataProvider } from "@/components/WeverseDataProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weverse Shop 예약판매",
  description: "Weverse Shop 예약판매 상품 모아보기",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const weverseData = await loadWeverseData();

  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <WeverseDataProvider data={weverseData}>
          <header className="sticky top-0 z-50 bg-gradient-to-r from-purple-700 via-purple-600 to-violet-500 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/" className="text-white font-extrabold text-lg">
                WV 예약판매
              </Link>
              <nav className="flex gap-4 text-sm">
                <Link
                  href="/"
                  className="text-white/80 hover:text-white transition"
                >
                  아티스트
                </Link>
                <Link
                  href="/all"
                  className="text-white/80 hover:text-white transition"
                >
                  전체상품
                </Link>
                <Link
                  href="/limited"
                  className="text-white/80 hover:text-white transition"
                >
                  구매제한
                </Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </WeverseDataProvider>
      </body>
    </html>
  );
}
