import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import { ApiEnvelope } from '../../../core/http/api.models';
import { ApiService } from '../../../core/http/api.service';

export interface CustomerCartItem {
  id: number;
  product_id: number;
  variant_id: number | null;
  quantity: string | number;
  unit_price_snapshot: string | number;
  product_name: string;
  product_code: string;
  line_total: string | number;
}

export interface CustomerCart {
  cart: { id: number; tenant_id: number; user_id: number; currency: string; cart_status: string } | null;
  items: CustomerCartItem[];
  subtotal: string;
}

export interface CartCheckoutResult {
  order_id: number;
  order_number: string;
  order_status: string;
  payment_status: string;
  subtotal: string;
  tax_amount: string;
  grand_total: string;
}

export interface ShippingAddressPayload {
  recipient_name?: string;
  mobile?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country_code?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerCartService {
  private readonly api = inject(ApiService);

  getCart(tenantId: number): Promise<CustomerCart> {
    return this.request<CustomerCart>('/api/v1/cart/get', 'getCart', { tenant_id: tenantId });
  }

  addItem(tenantId: number, productId: number, quantity: number, variantId?: number | null): Promise<{ cart_id: number }> {
    return this.request('/api/v1/cart/add', 'addItem', {
      tenant_id: tenantId,
      product_id: productId,
      quantity,
      ...(variantId ? { variant_id: variantId } : {}),
    });
  }

  updateItem(tenantId: number, itemId: number, quantity: number): Promise<{ cart_id: number }> {
    return this.request('/api/v1/cart/update', 'updateItem', { tenant_id: tenantId, item_id: itemId, quantity });
  }

  removeItem(tenantId: number, itemId: number): Promise<{ cart_id?: number }> {
    return this.request('/api/v1/cart/remove', 'removeItem', { tenant_id: tenantId, item_id: itemId });
  }

  clearCart(tenantId: number): Promise<Record<string, never>> {
    return this.request('/api/v1/cart/clear', 'clearCart', { tenant_id: tenantId });
  }

  checkout(tenantId: number, shippingAddress: ShippingAddressPayload, notes = ''): Promise<CartCheckoutResult> {
    return this.request('/api/v1/cart/checkout', 'checkout', {
      tenant_id: tenantId,
      shipping_address: shippingAddress,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  private async request<T>(path: string, actionType: string, actionData: object): Promise<T> {
    const response = await firstValueFrom(this.api.post<T>(path, {
      cartParam: { actionType, actionData },
    }));
    if (response.status !== 'SUCCESS') {
      throw new ApiError(response.msgArr?.join(' ') || 'The cart request could not be completed.');
    }
    if (!response.data || Array.isArray(response.data)) {
      throw new ApiError('The cart response did not contain the expected data.');
    }
    return response.data;
  }
}
