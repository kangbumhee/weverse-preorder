import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, "token.json");
const OUTPUT_FILE = path.join(__dirname, "..", "public", "data", "weverse-preorder-data.json");

const CURRENCY = "KRW";
const LANGUAGE = "ko";
const COUNTRY = "KR";

// ─── 토큰 관리 ───
// Git에 커밋된 token.json이 진짜 저장소. Secret은 token.json에 refresh가 없을 때만(최초 1회) 사용.

function loadToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      const rt = saved.refreshToken;
      if (rt && rt !== "null" && rt !== null) {
        console.log("token.json에서 refresh_token 로드");
        return { accessToken: saved.accessToken ?? null, refreshToken: rt };
      }
    }
  } catch (e) {
    console.log("token.json 읽기 실패:", e.message);
  }

  const envToken = process.env.WEVERSE_REFRESH_TOKEN;
  if (envToken) {
    console.log("환경변수에서 refresh_token 로드 (Secret / 최초 설정)");
    return { accessToken: null, refreshToken: envToken };
  }

  throw new Error(
    "토큰 없음: token.json에 refresh_token이 없고 WEVERSE_REFRESH_TOKEN도 없습니다."
  );
}

function saveToken(tokenData) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), "utf-8");
  console.log("token.json 저장 완료");
}

async function refreshAccessToken(refreshToken) {
  const resp = await fetch("https://accountapi.weverse.io/api/v1/token/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://shop.weverse.io/",
      Origin: "https://shop.weverse.io",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`토큰 갱신 실패 [${resp.status}]: ${text}`);
  }

  const data = await resp.json();
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || refreshToken,
  };
}

// ─── API 호출 ───

function makeHeaders(accessToken, artistId) {
  return {
    "accept-language": LANGUAGE,
    "authorization": `Bearer ${accessToken}`,
    "x-benx-artistid": String(artistId),
    "x-benx-currency": CURRENCY,
    "x-benx-language": LANGUAGE,
    "x-benx-os": "web",
    "x-weverse-usercountry": COUNTRY,
  };
}

async function apiCall(accessToken, apiPath, artistId) {
  const url = `https://shop.weverse.io${apiPath}`;
  const resp = await fetch(url, {
    headers: makeHeaders(accessToken, artistId),
  });

  if (!resp.ok) {
    if (resp.status === 401) throw new Error("AUTH_EXPIRED");
    console.log(`  API 에러 [${resp.status}]: ${apiPath.substring(0, 80)}`);
    return null;
  }

  return resp.json();
}

/** API가 배열 또는 { artists|data|categories|... } 래핑을 쓰는 경우 통일 */
function asArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const keys = ["artists", "data", "categories", "salesCategories", "items", "results"];
  for (const k of keys) {
    if (Array.isArray(payload[k])) return payload[k];
  }
  console.log("  asArray: 알 수 없는 응답 형식:", typeof payload, Object.keys(payload || {}).slice(0, 8));
  return [];
}

const SHOP_BASE = "https://shop.weverse.io";

const SHOP_MAIN_COOKIE = (accessToken) =>
  `we2_access_token=${accessToken}; NEXT_LOCALE=ko; wes_currency=${CURRENCY}; wes_display_user_country=${COUNTRY}; wes_order_user_country=${COUNTRY}`;

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

function normalizeArtist(a) {
  if (!a || typeof a.artistId !== "number") return null;
  return {
    artistId: a.artistId,
    name: a.name || a.shortName || "",
    shortName: a.shortName || a.name || "",
    logoImageUrl: a.logoImageUrl || a.profileImageUrl || "",
  };
}

function isArtistLikeArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const s = arr[0];
  return s && typeof s.artistId === "number" && (s.name != null || s.shortName != null);
}

/** __NEXT_DATA__ 전체에서 아티스트 배열 후보 수집 */
function collectArtistsFromNextData(nextData) {
  const seen = new Map();
  const add = (raw) => {
    const n = normalizeArtist(raw);
    if (n && !seen.has(n.artistId)) seen.set(n.artistId, n);
  };

  const queries = nextData?.props?.pageProps?.["$dehydratedState"]?.queries;
  if (Array.isArray(queries)) {
    for (const q of queries) {
      const data = q?.state?.data;
      if (!data) continue;
      if (isArtistLikeArray(data)) data.forEach(add);
      else if (data.artists && isArtistLikeArray(data.artists)) data.artists.forEach(add);
      else if (Array.isArray(data) && data.length && data[0]?.artist?.artistId) {
        data.forEach((row) => row.artist && add(row.artist));
      }
    }
  }

  const walk = (obj, depth) => {
    if (depth > 14 || obj == null || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      if (isArtistLikeArray(obj)) obj.forEach(add);
      else obj.forEach((x) => walk(x, depth + 1));
      return;
    }
    for (const v of Object.values(obj)) walk(v, depth + 1);
  };
  walk(nextData, 0);

  return [...seen.values()];
}

function getFallbackArtistsFromFile() {
  try {
    if (!fs.existsSync(OUTPUT_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
    if (raw.artists && Array.isArray(raw.artists) && raw.artists.length > 0) {
      console.log(`  기존 JSON에서 아티스트 ${raw.artists.length}개 로드 (fallback)`);
      return raw.artists
        .map(normalizeArtist)
        .filter(Boolean);
    }
  } catch (e) {
    console.log("  기존 JSON fallback 실패:", e.message);
  }
  return [];
}

const HARDCODED_ARTISTS_FALLBACK = [
  { artistId: 2, name: "BTS", shortName: "BTS", logoImageUrl: "" },
  { artistId: 3, name: "TOMORROW X TOGETHER", shortName: "TXT", logoImageUrl: "" },
  { artistId: 10, name: "ENHYPEN", shortName: "ENHYPEN", logoImageUrl: "" },
  { artistId: 50, name: "LE SSERAFIM", shortName: "LE SSERAFIM", logoImageUrl: "" },
  { artistId: 7, name: "SEVENTEEN", shortName: "SEVENTEEN", logoImageUrl: "" },
  { artistId: 82, name: "NewJeans", shortName: "NewJeans", logoImageUrl: "" },
  { artistId: 112, name: "BOYNEXTDOOR", shortName: "BOYNEXTDOOR", logoImageUrl: "" },
  { artistId: 120, name: "ILLIT", shortName: "ILLIT", logoImageUrl: "" },
  { artistId: 124, name: "EXO", shortName: "EXO", logoImageUrl: "" },
  { artistId: 131, name: "NCT DREAM", shortName: "NCT DREAM", logoImageUrl: "" },
  { artistId: 133, name: "aespa", shortName: "aespa", logoImageUrl: "" },
  { artistId: 167, name: "PLAVE", shortName: "PLAVE", logoImageUrl: "" },
];

/**
 * /api/v1/settings/artists 는 404. 샵 메인 HTML의 __NEXT_DATA__에서 아티스트 추출 (GitHub Actions 호환).
 */
async function getArtists(accessToken) {
  const mainUrl = `${SHOP_BASE}/ko/shop/${CURRENCY}`;
  console.log(`  샵 메인 페이지에서 아티스트 추출: ${mainUrl}`);

  let html;
  try {
    const res = await fetch(mainUrl, {
      headers: {
        ...BROWSER_HEADERS,
        Cookie: SHOP_MAIN_COOKIE(accessToken),
      },
    });
    if (!res.ok) {
      console.log(`  메인 페이지 HTTP ${res.status}`);
    }
    html = await res.text();
  } catch (e) {
    console.log("  메인 페이지 fetch 실패:", e.message);
    html = "";
  }

  const match =
    html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/) ||
    html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);

  if (!match) {
    console.log("  __NEXT_DATA__ 없음 → 파일/하드코딩 fallback");
    const fromFile = getFallbackArtistsFromFile();
    if (fromFile.length > 0) return fromFile;
    console.log("  하드코딩 아티스트 목록 사용 (최소 커버)");
    return HARDCODED_ARTISTS_FALLBACK.map((a) => ({ ...a }));
  }

  let nextData;
  try {
    nextData = JSON.parse(match[1]);
  } catch (e) {
    console.log("  __NEXT_DATA__ JSON 파싱 실패:", e.message);
    const fromFile = getFallbackArtistsFromFile();
    return fromFile.length > 0 ? fromFile : HARDCODED_ARTISTS_FALLBACK.map((a) => ({ ...a }));
  }

  const pp = nextData.props?.pageProps;
  if (pp && typeof pp === "object") {
    console.log("  pageProps 키:", Object.keys(pp).slice(0, 20).join(", "));
  }

  let artists = collectArtistsFromNextData(nextData);

  if (artists.length === 0) {
    console.log("  __NEXT_DATA__에서 아티스트 배열을 찾지 못함 → 파일 fallback");
    artists = getFallbackArtistsFromFile();
  }
  if (artists.length === 0) {
    console.log("  하드코딩 아티스트 목록 사용");
    artists = HARDCODED_ARTISTS_FALLBACK.map((a) => ({ ...a }));
  }

  artists.sort((a, b) => a.artistId - b.artistId);
  return artists;
}

async function getCategories(accessToken, artistId) {
  const data = await apiCall(
    accessToken,
    "/api/wvs/display/api/v1/artist-home/categories?displayPlatform=WEB",
    artistId
  );
  return asArray(data);
}

async function getCategoryProducts(accessToken, artistId, categoryId) {
  const data = await apiCall(
    accessToken,
    `/api/wvs/display/api/v1/artist-home/categories/${categoryId}/sales?displayPlatform=WEB&size=500`,
    artistId
  );
  if (!data || !data.productCards) return [];
  return data.productCards;
}

async function getProductDetail(accessToken, artistId, saleId) {
  // _next/data는 브라우저 전용이므로 서버에서는 페이지를 HTML로 가져와서 __NEXT_DATA__ 파싱
  // 대신 간단하게 상품 페이지의 JSON-LD 또는 SSR 데이터를 가져옴
  // 서버에서는 shop.weverse.io 페이지를 fetch해서 __NEXT_DATA__를 파싱
  try {
    const url = `https://shop.weverse.io/ko/shop/${CURRENCY}/artists/${artistId}/sales/${saleId}`;
    const resp = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Cookie: `we2_access_token=${accessToken}; wes_currency=${CURRENCY}; wes_artistId=${artistId}; NEXT_LOCALE=ko; wes_display_user_country=${COUNTRY}; wes_order_user_country=${COUNTRY}`,
      },
    });

    if (!resp.ok) return null;

    const html = await resp.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return null;

    const nextData = JSON.parse(match[1]);
    const queries = nextData.props?.pageProps?.["$dehydratedState"]?.queries;
    if (!queries) return null;

    for (const q of queries) {
      if (JSON.stringify(q.queryKey).includes("saleId")) {
        return q.state.data;
      }
    }
  } catch (e) {
    console.log(`  상세 로딩 실패: ${saleId} - ${e.message}`);
  }
  return null;
}

// ─── 메인 수집 로직 ───

async function collectData(accessToken) {
  console.log("아티스트 목록 수집...");
  const artists = await getArtists(accessToken);
  console.log(`아티스트 ${artists.length}개\n`);

  const result = {
    updatedAt: new Date().toISOString(),
    artists: artists.map((a) => ({
      artistId: a.artistId,
      name: a.name,
      shortName: a.shortName,
      logoImageUrl: a.logoImageUrl,
    })),
    products: [],
  };

  const seenIds = new Set();

  for (const artist of artists) {
    const aid = artist.artistId;
    console.log(`[${artist.shortName}] 카테고리 수집...`);

    const categories = await getCategories(accessToken, aid);
    let artistPreorderCount = 0;

    for (const cat of categories) {
      const products = await getCategoryProducts(accessToken, aid, cat.categoryId);
      for (const item of products) {
        if (!(item.icons || []).includes("PRE_ORDER")) continue;
        if (seenIds.has(item.saleId)) continue;
        seenIds.add(item.saleId);
        artistPreorderCount++;

        result.products.push({
          saleId: item.saleId,
          artistId: aid,
          artistName: artist.name,
          artistShortName: artist.shortName,
          category: cat.name,
          name: item.name,
          status: item.status,
          thumbnailImageUrl: item.thumbnailImageUrl,
          icons: item.icons || [],
          emblems: item.emblems || [],
          price: item.price,
          deliveryDate: item.deliveryDate,
          goodsType: item.goodsType,
          releaseCountryCode: item.releaseCountryCode,
          detail: null,
        });
      }
      await sleep(250);
    }

    if (artistPreorderCount > 0) {
      console.log(`  → 예약판매 ${artistPreorderCount}개`);
    }
    await sleep(300);
  }

  // 상세 정보 수집
  console.log(`\n상세 정보 수집 (${result.products.length}개)...\n`);

  for (let i = 0; i < result.products.length; i++) {
    const p = result.products[i];
    console.log(`[${i + 1}/${result.products.length}] ${p.artistShortName} - ${p.name}`);

    const detail = await getProductDetail(accessToken, p.artistId, p.saleId);
    if (detail) {
      p.detail = {
        goodsOrderLimit: detail.goodsOrderLimit || null,
        orderLimitInfo: detail.orderLimitInfo || null,
        ...(detail.saleStartAt ? { saleStartAt: detail.saleStartAt } : {}),
        preOrder: detail.preOrder || null,
        option: detail.option || null,
        shipping: detail.shipping || null,
        earnedCash: detail.price?.earnedCash || 0,
        thumbnailImageUrls: detail.thumbnailImageUrls || [],
        detailImages: detail.detailImages || [],
      };
    }
    await sleep(400);
  }

  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── 실행 ───

async function main() {
  console.log("=== Weverse Preorder Data Collector ===\n");

  let tokens;
  try {
    tokens = loadToken();
  } catch (e) {
    console.error(e.message);
    console.error("GitHub Secret WEVERSE_REFRESH_TOKEN을 설정하거나 token.json을 채워주세요.");
    process.exit(1);
  }

  try {
    console.log("토큰 갱신 중...");
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    tokens = {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
    saveToken(tokens);
    console.log("토큰 갱신 성공!\n");
  } catch (e) {
    console.error("토큰 갱신 실패:", e.message);
    process.exit(1);
  }

  try {
    const data = await collectData(tokens.accessToken);

    // JSON 저장
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log(`\n=== 완료 ===`);
    console.log(`아티스트: ${data.artists.length}개`);
    console.log(`예약판매 상품: ${data.products.length}개`);
    console.log(`파일: ${OUTPUT_FILE}`);
  } catch (e) {
    if (e.message === "AUTH_EXPIRED") {
      console.error("인증 만료. refresh_token을 교체해주세요.");
    } else {
      console.error("수집 실패:", e.message);
    }
    process.exit(1);
  }
}

main();
