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
  MarketplaceMedia,
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
  readonly selectedMedia = signal<MarketplaceMedia | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly slug = this.route.parent?.snapshot.paramMap.get('businessSlug') || '';

  readonly activeMedia = computed<MarketplaceMedia | null>(() => {
    const current = this.selectedMedia();
    if (current) return current;
    const list = this.detail()?.product?.media;
    if (!list?.length) return null;
    return (
      list.find((m) => m.url && m.media_type === 'IMAGE' && m.is_primary) ||
      list.find((m) => m.url && m.media_type === 'IMAGE') ||
      list[0]
    );
  });

  // Blinkit-style hover zoom state
  readonly isHoverZooming = signal(false);
  readonly zoomPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly lensPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly lensSize = signal<{ w: number; h: number }>({ w: 120, h: 120 });

  onImageHover(event: MouseEvent): void {
    if (this.activeMedia()?.media_type !== 'IMAGE') {
      this.isHoverZooming.set(false);
      return;
    }

    const target = event.currentTarget as HTMLElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));

    const lensW = Math.max(80, Math.min(140, rect.width * 0.3));
    const lensH = Math.max(80, Math.min(140, rect.height * 0.3));
    this.lensSize.set({ w: lensW, h: lensH });

    const lensX = Math.max(0, Math.min(x - lensW / 2, rect.width - lensW));
    const lensY = Math.max(0, Math.min(y - lensH / 2, rect.height - lensH));
    this.lensPosition.set({ x: lensX, y: lensY });

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    this.zoomPosition.set({ x: percentX, y: percentY });
    this.isHoverZooming.set(true);
  }

  onImageLeave(): void {
    this.isHoverZooming.set(false);
  }

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
        business.storefront.show_prices && this.hasValidPrice(product.selling_price) && !!currency;

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
      const defaultMedia =
        value.product.media?.find((m) => m.url && m.media_type === 'IMAGE' && m.is_primary) ||
        value.product.media?.find((m) => m.url && m.media_type === 'IMAGE') ||
        value.product.media?.[0] ||
        null;
      this.selectedMedia.set(defaultMedia);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load this product.');
    } finally {
      this.loading.set(false);
    }
  }

  selectMedia(media: MarketplaceMedia): void {
    if (media.media_type === 'IMAGE' || media.media_type === 'VIDEO') {
      this.selectedMedia.set(media);
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

  hasValidPrice(price: number | string | null | undefined): boolean {
    if (price === undefined || price === null || price === '') return false;
    const numeric = Number(price);
    return Number.isFinite(numeric) && numeric > 0;
  }

  formatPrice(price: number | string | null | undefined): string {
    const numeric = Number(price);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(numeric);
  }

  get whatsappUrl(): string | null {
    const product = this.detail()?.product;
    const biz = this.context.detail()?.business;
    if (!product || !biz) return null;
    const country = biz.address?.country_code ?? biz.country_code;
    const showPrice = this.context.detail()?.storefront?.show_prices;
    if (!showPrice || !this.hasValidPrice(product.selling_price)) {
      return this.whatsApp.buildProductPriceEnquiryUrl(product.product_name, biz.whatsapp_number, country);
    }
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
    const showPrice = this.context.detail()?.storefront?.show_prices;
    if (!showPrice || !this.hasValidPrice(product.selling_price)) {
      this.whatsApp.openProductPriceEnquiry(product.product_name, biz.whatsapp_number, country);
    } else {
      this.whatsApp.openProductEnquiry(product.product_name, biz.whatsapp_number, country);
    }
  }
}
