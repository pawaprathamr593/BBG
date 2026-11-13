export interface MarketplaceCategory {
  id: number;
  parent_category_id: number | null;
  category_code: string;
  category_name: string;
  category_type: string;
  description: string | null;
  display_order: number;
}

export interface MarketplaceBusiness {
  id: number;
  business_name: string;
  business_slug: string;
  business_description: string | null;
  category_id: number | null;
  category_name: string | null;
  business_phone: string | null;
  business_email: string | null;
  logo_path: string | null;
  cover_image_path: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  whatsapp_enabled: boolean;
  accept_online_orders: boolean;
  whatsapp_number?: string;
  address?: {
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country_code: string | null;
  };
  location?: {
    latitude: number | null;
    longitude: number | null;
  };
}

export interface MarketplacePromotion {
  id: number;
  tenant_id: number;
  post_title: string;
  post_content: string;
  published_on: string;
  valid_until: string | null;
  business_name: string;
  business_slug: string;
  logo_path: string | null;
}

export interface MarketplacePagination {
  page: number;
  page_size: number;
  total: number;
}

export interface MarketplaceList<T> {
  items: T[];
  pagination: MarketplacePagination;
}

export interface MarketplaceHomeSummary {
  categories: MarketplaceCategory[];
  businesses: MarketplaceBusiness[];
  promotions: MarketplacePromotion[];
}

export interface MarketplaceStorefront {
  title: string | null;
  description: string | null;
  theme_code: string | null;
  show_prices: boolean;
  accept_online_orders: boolean;
  whatsapp_enabled: boolean;
  currency: string | null;
}

export interface MarketplaceBusinessDetail {
  business: MarketplaceBusiness;
  storefront: MarketplaceStorefront;
}

export interface MarketplaceProduct {
  id: number;
  product_code: string;
  product_name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  brand_name: string | null;
  barcode: string | null;
  unit: {
    id: number;
    name: string;
    symbol: string;
    quantity_precision: number;
    is_fraction_allowed: boolean;
  };
  is_variant_product: boolean;
  selling_price?: number | string;
}

export interface MarketplaceProductVariant {
  id: number;
  variant_code: string;
  variant_name: string;
  barcode: string | null;
  selling_price?: number | string;
  unit_id: number | null;
  unit_name: string | null;
  unit_symbol: string | null;
  quantity_precision: number | null;
  is_fraction_allowed: boolean | null;
}

export interface MarketplaceProductDetail {
  product: MarketplaceProduct;
  variants: MarketplaceProductVariant[];
}

export interface MarketplacePromotionDetail {
  promotion: MarketplacePromotion;
  media: Array<{
    id: number;
    file_path: string;
    media_type: string;
    display_order: number;
  }>;
}
