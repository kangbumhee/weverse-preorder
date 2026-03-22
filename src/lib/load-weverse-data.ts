import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import type { WeverseData } from "./types";

export async function loadWeverseData(): Promise<WeverseData> {
  try {
    const fp = path.join(process.cwd(), "public", "data", "weverse-preorder-data.json");
    const raw = await readFile(fp, "utf-8");
    return JSON.parse(raw) as WeverseData;
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      artists: [],
      products: [],
    };
  }
}
