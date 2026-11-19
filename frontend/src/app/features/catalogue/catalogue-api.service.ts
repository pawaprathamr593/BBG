import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base-url';
import { AuthService } from '../../core/auth/auth.service';
import { S3UploadService } from '../../core/storage/s3-upload.service';

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

export interface ProductMedia {
  id: number;
  media_type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  mime_type: string;
  original_file_name: string;
  file_size_bytes: number;
  url: string | null;
  display_order: number;
  is_primary: number;
  media_status: string;
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
  primary_image_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogueApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly s3Upload = inject(S3UploadService);

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

  async listProductMedia(tenantId: number, productId: number): Promise<ProductMedia[]> {
    const data = await this.post<{ items: ProductMedia[] }>('products/media/list', { tenant_id: tenantId, product_id: productId });
    return data.items ?? [];
  }

  createProductMediaUploadUrl(tenantId: number, productId: number, file: File): Promise<{
    upload_url: string; object_key: string; method: 'PUT'; headers: Record<string, string>;
  }> {
    return this.post('products/media/upload-url', {
      tenant_id: tenantId, product_id: productId, original_file_name: file.name,
      mime_type: file.type, file_size_bytes: file.size,
    });
  }

  async uploadAndLinkProductMedia(tenantId: number, productId: number, file: File, displayOrder: number, primary: boolean, onProgress?: (progress: number) => void): Promise<void> {
    const upload = await this.createProductMediaUploadUrl(tenantId, productId, file);
    await this.s3Upload.upload(upload.upload_url, file, upload.headers ?? { 'Content-Type': file.type }, onProgress);
    const mediaType = file.type.startsWith('image/') ? 'IMAGE'
      : file.type.startsWith('video/') ? 'VIDEO'
      : file.type.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT';
    await this.post('products/media/link', {
      tenant_id: tenantId, product_id: productId, file_path: upload.object_key,
      original_file_name: file.name, mime_type: file.type, file_size_bytes: file.size,
      media_type: mediaType, display_order: displayOrder, is_primary: primary,
    });
  }

  deleteProductMedia(tenantId: number, productId: number, mediaId: number): Promise<{ id: number }> {
    return this.post('products/media/delete', { tenant_id: tenantId, product_id: productId, media_id: mediaId });
  }
}
