import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base-url';
import { AuthService } from '../../core/auth/auth.service';

export interface CatalogueApiResponse<T> {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr: string[];
  data: T | [];
}

export interface CatalogueUnit {
  id: number;
  unit_code: string;
  unit_name: string;
  unit_symbol: string;
  quantity_precision: number;
  is_fraction_allowed: boolean;
}

export interface CatalogueCategory {
  id: number;
  parent_category_id: number | null;
  category_name: string;
  description: string | null;
  display_order: number;
}

export interface CatalogueProduct {
  id: number;
  product_code: string;
  product_name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  base_unit_id: number;
  unit_name: string;
  unit_symbol: string;
  brand_name: string | null;
  barcode: string | null;
  cost_price: string | number;
  selling_price: string | number;
  tax_rate: string | number;
  track_inventory: number;
  is_variant_product: number;
  publication_status: 'DRAFT' | 'PUBLISHED';
  product_status: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogueApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.accessToken() ?? ''}` });
  }

  private async post<T>(path: string, actionData: Record<string, unknown> = {}): Promise<T> {
    const response = await firstValueFrom(this.http.post<CatalogueApiResponse<T>>(
      `${this.apiBaseUrl}/api/v1/catalogue/${path}`,
      { catalogueParam: { actionData } },
      { headers: this.headers },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'The catalogue request could not be completed.');
    }
    return response.data as T;
  }

  async listUnits(): Promise<CatalogueUnit[]> {
    const data = await this.post<{ items: CatalogueUnit[] }>('units/list');
    return data.items ?? [];
  }

  async listCategories(tenantId: number): Promise<CatalogueCategory[]> {
    const data = await this.post<{ items: CatalogueCategory[] }>('categories/list', { tenant_id: tenantId });
    return data.items ?? [];
  }

  async listProducts(tenantId: number, search = '', page = 1, pageSize = 50): Promise<{ items: CatalogueProduct[]; pagination: { page: number; page_size: number; total: number } }> {
    return this.post('products/list', { tenant_id: tenantId, search, page, page_size: pageSize });
  }

  createProduct(tenantId: number, payload: Record<string, unknown>): Promise<{ id: number }> {
    return this.post('products/create', { tenant_id: tenantId, ...payload });
  }

  updateProduct(tenantId: number, productId: number, payload: Record<string, unknown>): Promise<{ id: number }> {
    return this.post('products/update', { tenant_id: tenantId, product_id: productId, ...payload });
  }

  deleteProduct(tenantId: number, productId: number): Promise<{ id: number }> {
    return this.post('products/delete', { tenant_id: tenantId, product_id: productId });
  }

  createCategory(tenantId: number, categoryName: string, description: string): Promise<{ id: number }> {
    return this.post('categories/create', { tenant_id: tenantId, category_name: categoryName, description, display_order: 0 });
  }

  deleteCategory(tenantId: number, categoryId: number): Promise<{ id: number }> {
    return this.post('categories/delete', { tenant_id: tenantId, category_id: categoryId });
  }
}
