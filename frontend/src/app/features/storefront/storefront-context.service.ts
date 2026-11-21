import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  MarketplaceApiService,
  MarketplaceBusinessDetail,
} from '../../core/marketplace/marketplace-api.service';

@Injectable()
export class StorefrontContextService {
  private readonly api = inject(MarketplaceApiService);
  readonly detail = signal<MarketplaceBusinessDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.detail.set(null);
    try {
      const response = await firstValueFrom(this.api.getBusiness(slug));
      if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data))
        throw new Error(response.msgArr?.[0] || 'This storefront is not available.');
      this.detail.set(response.data as MarketplaceBusinessDetail);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load this storefront.');
    } finally {
      this.loading.set(false);
    }
  }
}
