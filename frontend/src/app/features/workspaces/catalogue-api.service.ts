import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { ApiService } from '../../core/http/api.service';
import { ApiEnvelope } from '../../core/http/api.models';
import {
  CatalogueCategory,
  CataloguePage,
  CatalogueProduct,
  CatalogueUnit,
  CategoryPayload,
  ProductPayload,
} from './catalogue.models';

@Injectable({ providedIn: 'root' })
export class CatalogueApiService {
  private readonly api = inject(ApiService);

  listProducts(tenantId: number, page = 1, pageSize = 20, search = ''): Promise<CataloguePage<CatalogueProduct>> {
    return this.request('/api/v1/catalogue/products/list', 'listTenantProducts', 'catalogueParam', {
      tenant_id: tenantId, page, page_size: pageSize, search,
    });
  }

  getProduct(tenantId: number, productId: number): Promise<CatalogueProduct> {
    return this.request('/api/v1/catalogue/products/detail', 'getTenantProduct', 'catalogueParam', {
      tenant_id: tenantId, product_id: productId,
    });
  }

  listCategories(tenantId: number): Promise<{ items: CatalogueCategory[] }> {
    return this.request('/api/v1/catalogue/categories/list', 'listTenantProductCategories', 'catalogueParam', { tenant_id: tenantId });
  }

  listUnits(): Promise<{ items: CatalogueUnit[] }> {
    return this.request('/api/v1/catalogue/units/list', 'listUnitsOfMeasure', 'catalogueParam', {});
  }

  createProduct(tenantId: number, payload: ProductPayload): Promise<{ id: number }> {
    return this.request('/api/v1/catalogue/products/create', 'createTenantProduct', 'catalogueParam', {
      tenant_id: tenantId, ...payload,
    });
  }

  updateProduct(tenantId: number, productId: number, payload: ProductPayload): Promise<{ id: number }> {
    return this.request('/api/v1/catalogue/products/update', 'updateTenantProduct', 'catalogueParam', {
      tenant_id: tenantId, product_id: productId, ...payload,
    });
  }

  deleteProduct(tenantId: number, productId: number): Promise<{ id: number }> {
    return this.request('/api/v1/catalogue/products/delete', 'deleteTenantProduct', 'catalogueParam', {
      tenant_id: tenantId, product_id: productId,
    });
  }

  createCategory(tenantId: number, payload: CategoryPayload): Promise<{ id: number }> {
    return this.request('/api/v1/catalogue/categories/create', 'createTenantProductCategory', 'catalogueParam', {
      tenant_id: tenantId, ...payload,
    });
  }

  updateCategory(tenantId: number, categoryId: number, payload: CategoryPayload): Promise<{ id: number }> {
    return this.request('/api/v1/catalogue/categories/update', 'updateTenantProductCategory', 'catalogueParam', {
      tenant_id: tenantId, category_id: categoryId, ...payload,
    });
  }

  deleteCategory(tenantId: number, categoryId: number): Promise<{ id: number }> {
    return this.request('/api/v1/catalogue/categories/delete', 'deleteTenantProductCategory', 'catalogueParam', {
      tenant_id: tenantId, category_id: categoryId,
    });
  }

  private async request<T>(path: string, actionType: string, envelope: string, actionData: Record<string, unknown>): Promise<T> {
    const response = await firstValueFrom(this.api.post<T>(path, {
      [envelope]: { actionType, actionData },
    }));
    if (response.status !== 'SUCCESS') {
      throw new ApiError(response.msgArr?.join(' ') || 'Catalogue request failed.', null, response.msgArr ?? []);
    }
    if (!response.data || Array.isArray(response.data)) {
      throw new ApiError('The catalogue response did not contain the expected data object.');
    }
    return response.data;
  }
}
