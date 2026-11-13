import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketplaceBusinessDetail, MarketplaceProductDetail } from '../../models/marketplace.models';
import { MarketplaceService } from '../../services/marketplace.service';
import { SeoService } from '../../../../core/seo/seo.service';

@Component({
  selector: 'app-public-product-detail',
  imports: [RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly marketplace = inject(MarketplaceService);
  private readonly seo = inject(SeoService);
  protected readonly slug = this.route.snapshot.paramMap.get('businessSlug')
    ?? this.route.parent?.snapshot.paramMap.get('businessSlug') ?? '';
  private readonly productId = Number(this.route.snapshot.paramMap.get('productId'));
  protected readonly detail = signal<MarketplaceProductDetail | null>(null);
  protected readonly business = signal<MarketplaceBusinessDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    if (!this.slug || !Number.isInteger(this.productId) || this.productId < 1) {
      this.error.set('This product link is not valid.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const [detail, business] = await Promise.all([
        this.marketplace.getProduct(this.slug, this.productId),
        this.marketplace.getBusiness(this.slug),
      ]);
      this.detail.set(detail);
      this.business.set(business);
      const product = detail.product;
      const description = product.description || `Explore ${product.product_name} from ${business.business.business_name} on BBG.`;
      const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.product_name,
        description,
        url: `/businesses/${encodeURIComponent(this.slug)}/products/${product.id}`,
        ...(product.brand_name ? { brand: { '@type': 'Brand', name: product.brand_name } } : {}),
      };
      if (business.storefront.show_prices && product.selling_price !== undefined && business.storefront.currency) {
        schema['offers'] = {
          '@type': 'Offer',
          price: String(product.selling_price),
          priceCurrency: business.storefront.currency,
        };
      }
      this.seo.update(`${product.product_name} | ${business.business.business_name} | BBG`, description,
        `/businesses/${encodeURIComponent(this.slug)}/products/${product.id}`, schema);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load this product.');
    } finally { this.loading.set(false); }
  }
}
