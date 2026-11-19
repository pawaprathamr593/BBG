/**
 * Stable presentation contracts for the shared marketplace cards.
 * Feature/API DTOs are structurally mapped to these models by their parent components.
 * Shared cards must not depend on API services, feature stores or routing.
 */
export interface CardMediaModel {
  id: number;
  media_type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  original_file_name?: string;
  url: string | null;
}

export interface BusinessCardModel {
  id: number;
  business_name: string;
  business_slug: string;
  business_description: string | null;
  category_name: string | null;
  logo_path: string | null;
  cover_image_path: string | null;
  city: string | null;
  state: string | null;
  whatsapp_enabled: boolean;
  accept_online_orders: boolean;
  rank?: number;
  popularity?: { views: number; enquiries: number; engagements: number };
  created_on?: string;
}

export interface ProductCardModel {
  id: number;
  product_name: string;
  description: string | null;
  category_name: string | null;
  brand_name: string | null;
  selling_price?: number | string;
  primary_image_url?: string | null;
  media?: CardMediaModel[];
  unit: { symbol: string };
  business: { business_name: string; business_slug: string };
  distance_km?: number;
  popularity?: { engagements: number };
  created_on: string;
}

export interface PromotionCardModel {
  id: number;
  post_title: string;
  post_content: string;
  published_on: string;
  valid_until: string | null;
  business_name: string;
  business_slug: string;
  media?: CardMediaModel[];
}
