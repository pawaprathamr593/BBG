import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketplaceBusinessDetail, MarketplaceList, MarketplaceProduct } from '../../models/marketplace.models';
import { MarketplaceService } from '../../services/marketplace.service';

@Component({
  selector: 'app-business-storefront',
  imports: [RouterLink],
  templateUrl: './business-storefront.html',
  styleUrl: './business-storefront.scss',
})
export class BusinessStorefront implements OnInit {
  private readonly marketplace = inject(MarketplaceService);
  private readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('businessSlug') ?? '';
  protected readonly detail = signal<MarketplaceBusinessDetail | null>(null);
  protected readonly products = signal<MarketplaceList<MarketplaceProduct> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    if (!this.slug) {
      this.error.set('A business storefront could not be identified.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const [detail, products] = await Promise.all([
        this.marketplace.getBusiness(this.slug),
        this.marketplace.listProducts(this.slug, 1, 20),
      ]);
      this.detail.set(detail);
      this.products.set(products);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load this storefront.');
    } finally {
      this.loading.set(false);
    }
  }
}
