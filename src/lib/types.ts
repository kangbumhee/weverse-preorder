export interface Artist {
  artistId: number;
  name: string;
  shortName: string;
  logoImageUrl: string;
}

export interface ProductPrice {
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  [key: string]: unknown;
}

export interface OptionItem {
  saleOptionName: string;
  isSoldOut: boolean;
  optionSalePrice: number;
  optionOrderLimit?: {
    orderLimitType: string;
    maxOrderQuantity: number;
  };
  [key: string]: unknown;
}

export interface GoodsOrderLimit {
  orderLimitType: string;
  maxOrderQuantity: number;
  availableQuantity: number;
}

export interface PreOrder {
  deliveryStartAt: string;
  deliveryEndAt: string;
  enablePreOrder: boolean;
}

export interface ShippingPolicy {
  minShippingCost: { cost: number; section: number };
  freeShippingCost: { cost: number };
}

export interface ProductDetail {
  goodsOrderLimit: GoodsOrderLimit | null;
  orderLimitInfo: { descriptions: string[] } | null;
  /** 판매 시작일 (API에 있을 때만) */
  saleStartAt?: string;
  preOrder: PreOrder | null;
  option: { options: OptionItem[] } | null;
  shipping: {
    shippingCountry: {
      deliveryDisplayName: string;
      shippingPolicy: ShippingPolicy;
    };
  } | null;
  earnedCash: number;
  thumbnailImageUrls: string[];
  detailImages: { imageUrl: string; width: number; height: number }[];
}

export interface Product {
  saleId: number;
  artistId: number;
  artistName: string;
  artistShortName: string;
  category: string;
  name: string;
  status: "SALE" | "SOLD_OUT" | "TO_BE_SOLD";
  thumbnailImageUrl: string;
  icons: string[];
  emblems: string[];
  price: ProductPrice;
  deliveryDate: string;
  goodsType: string;
  releaseCountryCode: string;
  detail: ProductDetail | null;
}

export interface WeverseData {
  updatedAt: string;
  artists: Artist[];
  products: Product[];
}
