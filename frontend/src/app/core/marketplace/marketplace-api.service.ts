import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';

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
  rank?: number;
  popularity?: {
    views: number;
    enquiries: number;
    engagements: number;
  };
  created_on?: string;
}

export interface MarketplaceProduct {
  id: number;
  product_code: string;
  product_name: string;
  description: string | null;
  category_id: number | null;
  global_category_id?: number | null;
  category_name: string | null;
  brand_name: string | null;
  barcode: string | null;
  selling_price?: number | string;
  unit: {
    id: number;
    name: string;
    symbol: string;
    quantity_precision: number;
    is_fraction_allowed: boolean;
  };
  is_variant_product: boolean;
  created_on: string;
  business: {
    business_name: string;
    business_slug: string;
    logo_path: string | null;
    city?: string | null;
    state?: string | null;
  };
  distance_km?: number;
  popularity?: { views: number; likes: number; engagements: number };
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

export interface MarketplaceHomeStats {
  businesses_registered: number;
  platform_users: number;
  products_listed: number;
  orders_completed: number;
}

export interface MarketplaceHomeData {
  stats: MarketplaceHomeStats;
  categories: MarketplaceCategory[];
  businesses: MarketplaceBusiness[];
  popular_businesses?: MarketplaceBusiness[];
  recent_businesses?: MarketplaceBusiness[];
  recent_products?: MarketplaceProduct[];
  promotions: MarketplacePromotion[];
  discovery_meta?: {
    popular_businesses_ranking_basis: string[];
    recent_businesses_sort_basis: string;
    recent_products_sort_basis: string;
  };
}

export interface MarketplaceBusinessListData {
  items: MarketplaceBusiness[];
  ranking_basis?: string[];
  sort_basis?: string;
  timestamp_note?: string;
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

export interface MarketplaceProductListData {
  items: MarketplaceProduct[];
  sort?: string;
  sort_basis: string;
  timestamp_note: string;
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

export interface MarketplaceApiResponse<T> {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr: string[];
  data: T | [];
}

@Injectable({ providedIn: 'root' })
export class MarketplaceApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getHomeSummary(): Observable<MarketplaceApiResponse<MarketplaceHomeData>> {
    return this.http.post<MarketplaceApiResponse<MarketplaceHomeData>>(
      `${this.apiBaseUrl}/api/v1/marketplace/home`,
      { marketplaceParam: { actionData: {} } },
    );
  }


  listPublicCategories(): Observable<MarketplaceApiResponse<{ items: MarketplaceCategory[] }>> {
    return this.http.post<MarketplaceApiResponse<{ items: MarketplaceCategory[] }>>(
      `${this.apiBaseUrl}/api/v1/marketplace/categories/list`,
      { marketplaceParam: { actionData: {} } },
    );
  }

  listPublicProductCategories(): Observable<MarketplaceApiResponse<{ items: MarketplaceCategory[] }>> {
    return this.http.post<MarketplaceApiResponse<{ items: MarketplaceCategory[] }>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/categories`,
      { marketplaceParam: { actionData: {} } },
    );
  }

  listProducts(
    filters: {
      search?: string;
      category_id?: number;
      brand?: string;
      city?: string;
      state?: string;
      min_price?: number;
      max_price?: number;
      online_only?: boolean;
      variants_only?: boolean;
      with_images?: boolean;
      sort?: 'newest' | 'popular' | 'nearby' | 'price_low' | 'price_high' | 'name';
      latitude?: number;
      longitude?: number;
    },
    page = 1,
    pageSize = 20,
  ): Observable<MarketplaceApiResponse<MarketplaceProductListData>> {
    return this.http.post<MarketplaceApiResponse<MarketplaceProductListData>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/list`,
      { marketplaceParam: { actionData: { ...filters, page, page_size: pageSize } } },
    );
  }

  listPopularBusinesses(page = 1, pageSize = 8): Observable<MarketplaceApiResponse<MarketplaceBusinessListData>> {
    return this.http.post<MarketplaceApiResponse<MarketplaceBusinessListData>>(
      `${this.apiBaseUrl}/api/v1/marketplace/businesses/popular`,
      { marketplaceParam: { actionData: { page, page_size: pageSize } } },
    );
  }

  listRecentBusinesses(page = 1, pageSize = 8): Observable<MarketplaceApiResponse<MarketplaceBusinessListData>> {
    return this.http.post<MarketplaceApiResponse<MarketplaceBusinessListData>>(
      `${this.apiBaseUrl}/api/v1/marketplace/businesses/recent`,
      { marketplaceParam: { actionData: { page, page_size: pageSize } } },
    );
  }

  listRecentProducts(page = 1, pageSize = 8): Observable<MarketplaceApiResponse<MarketplaceProductListData>> {
    return this.http.post<MarketplaceApiResponse<MarketplaceProductListData>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/recent`,
      { marketplaceParam: { actionData: { page, page_size: pageSize } } },
    );
  }

  recordProductView(productId: number, visitorKey: string): Observable<MarketplaceApiResponse<{ recorded: boolean }>> {
    return this.http.post<MarketplaceApiResponse<{ recorded: boolean }>>(
      `${this.apiBaseUrl}/api/v1/engagement/views/record`,
      {
        engagementParam: {
          actionData: {
            content_type: 'PRODUCT',
            content_id: productId,
            visitor_key: visitorKey,
          },
        },
      },
    );
  }

  recordBusinessView(businessId: number, visitorKey: string): Observable<MarketplaceApiResponse<{ recorded: boolean }>> {
    return this.http.post<MarketplaceApiResponse<{ recorded: boolean }>>(
      `${this.apiBaseUrl}/api/v1/engagement/views/record`,
      {
        engagementParam: {
          actionData: {
            content_type: 'BUSINESS',
            content_id: businessId,
            visitor_key: visitorKey,
          },
        },
      },
    );
  }

  listBusinesses(
    filters: { search?: string; city?: string; state?: string; category_id?: number },
    page = 1,
    pageSize = 20,
  ): Observable<MarketplaceApiResponse<MarketplaceBusinessListData>> {
    return this.http.post<MarketplaceApiResponse<MarketplaceBusinessListData>>(
      `${this.apiBaseUrl}/api/v1/marketplace/businesses/list`,
      { marketplaceParam: { actionData: { ...filters, page, page_size: pageSize } } },
    );
  }
}
