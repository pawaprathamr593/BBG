import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { ApiError } from '../../../core/http/api-error';
import { ApiEnvelope } from '../../../core/http/api.models';
import {
  MarketplaceBusiness,
  MarketplaceBusinessDetail,
  MarketplaceCategory,
  MarketplaceHomeSummary,
  MarketplaceList,
  MarketplaceProduct,
  MarketplaceProductDetail,
  MarketplacePromotion,
  MarketplacePromotionDetail,
} from '../models/marketplace.models';

export interface BusinessDirectoryQuery {
  page?: number;
  page_size?: number;
  search?: string;
  city?: string;
  state?: string;
  category_id?: number;
}

export interface PromotionFeedQuery {
  page?: number;
  page_size?: number;
  business_slug?: string;
}

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly api = inject(ApiService);

  async getHomeSummary(): Promise<MarketplaceHomeSummary> {
    return this.request<MarketplaceHomeSummary>('/api/v1/marketplace/home', 'getHomeSummary');
  }

  async listCategories(): Promise<MarketplaceCategory[]> {
    const result = await this.request<{ items: MarketplaceCategory[] }>(
      '/api/v1/marketplace/categories/list',
      'listPublicCategories',
    );
    return result.items;
  }

  async listBusinesses(query: BusinessDirectoryQuery = {}): Promise<MarketplaceList<MarketplaceBusiness>> {
    return this.request<MarketplaceList<MarketplaceBusiness>>(
      '/api/v1/marketplace/businesses/list',
      'listBusinesses',
      query,
    );
  }

  async getBusiness(businessSlug: string): Promise<MarketplaceBusinessDetail> {
    return this.request<MarketplaceBusinessDetail>(
      '/api/v1/marketplace/businesses/detail',
      'getBusiness',
      { business_slug: businessSlug },
    );
  }

  async listProducts(businessSlug: string, page = 1, pageSize = 20, search = ''): Promise<MarketplaceList<MarketplaceProduct>> {
    return this.request<MarketplaceList<MarketplaceProduct>>(
      '/api/v1/marketplace/products/list',
      'listProducts',
      { business_slug: businessSlug, page, page_size: pageSize, search },
    );
  }

  async getProduct(businessSlug: string, productId: number): Promise<MarketplaceProductDetail> {
    return this.request<MarketplaceProductDetail>(
      '/api/v1/marketplace/products/detail',
      'getProduct',
      { business_slug: businessSlug, product_id: productId },
    );
  }

  async listPromotions(query: PromotionFeedQuery = {}): Promise<MarketplaceList<MarketplacePromotion>> {
    return this.request<MarketplaceList<MarketplacePromotion>>(
      '/api/v1/marketplace/promotions/list',
      'listPublicPromotions',
      query,
    );
  }

  async getPromotion(promotionId: number): Promise<MarketplacePromotionDetail> {
    return this.request<MarketplacePromotionDetail>(
      '/api/v1/marketplace/promotions/detail',
      'getPublicPromotion',
      { promotion_id: promotionId },
    );
  }

  private async request<T>(path: string, action: string, actionData: object = {}): Promise<T> {
    const response = await firstValueFrom(this.api.post<T>(path, {
      marketplaceParam: { actionType: action, actionData },
    }));
    return this.unwrap(response);
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response.status !== 'SUCCESS') {
      throw new ApiError(response.msgArr?.join(' ') || 'Marketplace request failed.');
    }
    if (Array.isArray(response.data)) {
      throw new ApiError('The marketplace response did not contain the expected data object.');
    }
    return response.data;
  }
}
