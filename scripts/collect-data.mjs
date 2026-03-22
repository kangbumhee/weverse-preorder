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

function loadTokens() {
  // 환경변수에서 refresh_token 가져오기 (GitHub Secrets)
  const envRefresh = process.env.WEVERSE_REFRESH_TOKEN;

  // 파일에 저장된 토큰 확인
  if (fs.existsSync(TOKEN_FILE)) {
    const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    // 환경변수가 있으면 그걸 우선 사용 (최초 설정 또는 수동 교체 시)
    if (envRefresh && envRefresh !== saved.refreshToken) {
      saved.refreshToken = envRefresh;
      saved.accessToken = null; // 새 refresh면 access도 갱신 필요
    }
    return saved;
  }

  return { accessToken: null, refreshToken: envRefresh || null };
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

async function refreshAccessToken(refreshToken) {
  console.log("토큰 갱신 중...");
  const resp = await fetch("https://accountapi.weverse.io/api/v1/token/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`토큰 갱신 실패 [${resp.status}]: ${text}`);
  }

  const data = await resp.json();
  console.log("토큰 갱신 성공!");
  // 새 refresh_token도 반환됨 → 자동 갱신 (90일 연장)
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
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

async function getArtists(accessToken) {
  const data = await apiCall(accessToken, "/api/v1/settings/artists", 2);
  const list = asArray(data);
  if (list.length === 0 && data && typeof data === "object" && !Array.isArray(data)) {
    console.log("  아티스트 API 응답 키:", Object.keys(data).join(", "));
  }
  return list;
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": `we2_access_token=${accessToken}; wes_currency=${CURRENCY}; wes_artistId=${artistId}; NEXT_LOCALE=ko; wes_display_user_country=${COUNTRY}; wes_order_user_country=${COUNTRY}`,
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

  let tokens = loadTokens();

  if (!tokens.refreshToken) {
    console.error("refresh_token이 없습니다.");
    console.error("GitHub Secrets에 WEVERSE_REFRESH_TOKEN을 설정하세요.");
    process.exit(1);
  }

  // access_token 갱신
  try {
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    tokens.accessToken = newTokens.accessToken;
    tokens.refreshToken = newTokens.refreshToken; // 새 refresh_token으로 자동 갱신!
    saveTokens(tokens);
    console.log("토큰 파일 저장 완료 (refresh_token 자동 갱신됨)\n");
  } catch (e) {
    console.error("토큰 갱신 실패:", e.message);
    process.exit(1);
  }

  // 데이터 수집
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
