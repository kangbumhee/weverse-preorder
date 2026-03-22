"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { WeverseData } from "@/lib/types";

const WeverseDataContext = createContext<WeverseData | null>(null);

export function WeverseDataProvider({
  data,
  children,
}: {
  data: WeverseData;
  children: ReactNode;
}) {
  return (
    <WeverseDataContext.Provider value={data}>{children}</WeverseDataContext.Provider>
  );
}

export function useWeverseData(): WeverseData {
  const v = useContext(WeverseDataContext);
  if (!v) {
    throw new Error("useWeverseData must be used within WeverseDataProvider");
  }
  return v;
}
