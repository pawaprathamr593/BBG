import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  MarketplaceApiService,
  MarketplaceProductDetail,
} from '../../core/marketplace/marketplace-api.service';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';
import { WhatsAppService } from '../../core/whatsapp/whatsapp.service';
import {
  BreadcrumbsComponent,
  BreadcrumbItem,
} from '../../shared/components/breadcrumbs/breadcrumbs.component';
import { ProductReviewsComponent } from '../../shared/components/product-reviews/product-reviews.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-storefront-product-detail',
  imports: [RouterLink, BreadcrumbsComponent, ProductReviewsComponent],
  templateUrl: './storefront-product-detail.html',
  styleUrl: './storefront-product-detail.scss',
})
export class StorefrontProductDetail implements OnInit {
  readonly context = inject(StorefrontContextService);
  private readonly api = inject(MarketplaceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(StorefrontSeoService);
  private readonly whatsApp = inject(WhatsAppService);

  readonly detail = signal<MarketplaceProductDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly slug = this.route.parent?.snapshot.paramMap.get('businessSlug') || '';

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const value = this.detail();
    const productName = value?.product?.product_name || 'Product';
    return [
      { label: 'Home', url: `/store/${this.slug}` },
      { label: 'Products', url: `/store/${this.slug}/products` },
      { label: productName },
    ];
  });

  constructor() {
    effect(() => {
      const value = this.detail();
      const business = this.context.detail();
      if (!value || !business) return;

      const product = value.product;
      const businessName = business.storefront.title || business.business.business_name;
      const description =
        product.description ||
        'Explore ' +
          product.product_name +
          ' from ' +
          businessName +
          '. Contact the business for further information.';
      const routeSlug = this.route.snapshot.paramMap.get('productSlug') || '';
      const path = '/store/' + encodeURIComponent(this.slug) + '/products/' + routeSlug;
      const currency = business.storefront.currency;
      const showPrice =
        business.storefront.show_prices && product.selling_price !== undefined && !!currency;

      this.seo.update(product.product_name + ' | ' + businessName, description, path, {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.product_name,
        description,
        sku: product.product_code,
        url: this.seo.canonicalUrl(path),
        ...(product.brand_name ? { brand: { '@type': 'Brand', name: product.brand_name } } : {}),
        ...(showPrice
          ? {
              offers: {
                '@type': 'Offer',
                price: String(product.selling_price),
                priceCurrency: currency,
                seller: { '@type': 'Organization', name: businessName },
              },
            }
          : {}),
      });
    });
  }

  get businessName(): string {
    const data = this.context.detail();
    return data?.storefront.title || data?.business.business_name || 'Business';
  }

  async ngOnInit(): Promise<void> {
    const routeSlug = this.route.snapshot.paramMap.get('productSlug') || '';
    const publicId = routeSlug.slice(routeSlug.lastIndexOf('-') + 1);
    if (!this.slug || !publicId || publicId === routeSlug) {
      this.error.set('This product URL is not valid.');
      this.loading.set(false);
      return;
    }

    try {
      const response = await firstValueFrom(this.api.getStorefrontProduct(this.slug, publicId));
      if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
        throw new Error(response.msgArr?.[0] || 'This published product could not be found.');
      }

      const value = response.data as MarketplaceProductDetail;
      this.detail.set(value);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load this product.');
    } finally {
      this.loading.set(false);
    }
  }

  get isWhatsAppAvailable(): boolean {
    const biz = this.context.detail()?.business;
    const storefront = this.context.detail()?.storefront;
    const country = biz?.address?.country_code ?? biz?.country_code;
    return this.whatsApp.isWhatsAppAvailable(
      biz?.whatsapp_number,
      storefront?.whatsapp_enabled,
      country,
    );
  }

  get whatsappUrl(): string | null {
    const product = this.detail()?.product;
    const biz = this.context.detail()?.business;
    if (!product || !biz) return null;
    const country = biz.address?.country_code ?? biz.country_code;
    return this.whatsApp.buildProductEnquiryUrl(product.product_name, biz.whatsapp_number, country);
  }

  onWhatsAppEnquiry(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const product = this.detail()?.product;
    const biz = this.context.detail()?.business;
    if (!product || !biz) return;
    const country = biz.address?.country_code ?? biz.country_code;
    this.whatsApp.openProductEnquiry(product.product_name, biz.whatsapp_number, country);
  }
}
