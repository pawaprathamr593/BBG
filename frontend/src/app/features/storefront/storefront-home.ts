import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  MarketplaceApiService,
  MarketplaceBusinessDetail,
  MarketplaceProduct,
  MarketplacePromotion,
} from '../../core/marketplace/marketplace-api.service';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';
import { WhatsAppService } from '../../core/whatsapp/whatsapp.service';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { PromotionCard } from '../../shared/components/promotion-card/promotion-card';
import { InfiniteScrollSentinelComponent } from '../../shared/components/infinite-scroll-sentinel/infinite-scroll-sentinel.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  buildProductRouteSlug,
  mapMarketplaceProductToCardModel,
} from '../../shared/models/marketplace-card.mappers';
import type {
  ProductCardModel,
  PromotionCardModel,
} from '../../shared/models/marketplace-card.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-storefront-home',
  imports: [
    RouterLink,
    ProductCard,
    PromotionCard,
    InfiniteScrollSentinelComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './storefront-home.html',
  styleUrl: './storefront-home.scss',
})
export class StorefrontHome {
  readonly context = inject(StorefrontContextService);
  private readonly api = inject(MarketplaceApiService);
  private readonly router = inject(Router);
  private readonly seo = inject(StorefrontSeoService);
  private readonly whatsApp = inject(WhatsAppService);
  readonly products = signal<MarketplaceProduct[]>([]);
  readonly promotions = signal<MarketplacePromotion[]>([]);
  readonly promotionsPage = signal(1);
  readonly promotionsPageSize = 3;
  readonly promotionsTotal = signal(0);
  readonly promotionsLoadingMore = signal(false);
  readonly hasMorePromotions = computed(() => this.promotions().length < this.promotionsTotal());
  readonly loading = signal(true);
  readonly selectedCategory = signal('all');
  readonly shareFeedback = signal('');
  readonly catalogueEnabled = computed(() => this.context.detail()?.storefront.catalogue_enabled ?? false);
  readonly promotionsEnabled = computed(() => this.context.detail()?.storefront.promotions_enabled ?? false);
  readonly categories = computed(() =>
    [
      ...new Set(
        this.products()
          .map((item) => item.category_name)
          .filter((value): value is string => !!value),
      ),
    ].sort((a, b) => a.localeCompare(b)),
  );
  readonly filteredProducts = computed(() =>
    (this.selectedCategory() === 'all'
      ? this.products()
      : this.products().filter((item) => item.category_name === this.selectedCategory())
    ).slice(0, 3),
  );
  readonly visiblePromotions = computed<MarketplacePromotion[]>(() => this.promotions());
  readonly filteredProductCards = computed<ProductCardModel[]>(() => {
    const detail = this.context.detail();
    return this.filteredProducts().map((product) =>
      mapMarketplaceProductToCardModel(product, detail),
    );
  });

  get brandName(): string {
    const detail = this.context.detail();
    return detail?.storefront.title || detail?.business.business_name || 'Storefront';
  }

  private initializedSlug = '';

  constructor() {
    effect(() => {
      const detail = this.context.detail();
      if (!detail) return;
      const slug = detail.business.business_slug;
      if (!slug || this.initializedSlug === slug) return;
      this.initializedSlug = slug;
      void this.initializeStorefront();
    });
  }

  private async initializeStorefront(): Promise<void> {
    const detail = this.context.detail();
    const slug = detail?.business.business_slug;
    if (!detail || !slug) {
      this.loading.set(false);
      return;
    }

    const name = detail.storefront.title || detail.business.business_name;
    const description =
      detail.storefront.description ||
      detail.business.business_description ||
      'Browse products and contact ' + name + ' through its official BBG storefront.';
    const path = '/store/' + encodeURIComponent(slug);
    this.seo.update(name + ' | Official Storefront', description, path, {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: name + ' | Official Storefront',
      description,
      url: this.seo.canonicalUrl(path),
      about: this.businessSchema(detail),
    });

    const productPromise = this.catalogueEnabled()
      ? firstValueFrom(this.api.listStorefrontProducts(slug, 1, 50, '', { sort: 'newest' }))
      : Promise.resolve(null);
    const promotionPromise = this.promotionsEnabled()
      ? firstValueFrom(this.api.getStorefrontPromotions(slug, 1, this.promotionsPageSize))
      : Promise.resolve(null);

    const [productResult, promotionResult] = await Promise.allSettled([
      productPromise,
      promotionPromise,
    ]);
    if (
      productResult.status === 'fulfilled' &&
      productResult.value &&
      productResult.value.status === 'SUCCESS' &&
      !Array.isArray(productResult.value.data)
    ) {
      this.products.set(productResult.value.data.items || []);
    }
    if (
      promotionResult.status === 'fulfilled' &&
      promotionResult.value &&
      promotionResult.value.status === 'SUCCESS' &&
      !Array.isArray(promotionResult.value.data)
    ) {
      const items = promotionResult.value.data.items || [];
      this.promotions.set(items);
      this.promotionsTotal.set(promotionResult.value.data.pagination?.total ?? items.length);
    }
    this.loading.set(false);
  }

  async loadMorePromotions(): Promise<void> {
    const slug = this.context.detail()?.business.business_slug;
    if (!slug || this.promotionsLoadingMore() || !this.hasMorePromotions()) return;
    const nextPage = this.promotionsPage() + 1;
    this.promotionsLoadingMore.set(true);
    try {
      const result = await firstValueFrom(
        this.api.getStorefrontPromotions(slug, nextPage, this.promotionsPageSize),
      );
      if (result.status === 'SUCCESS' && result.data && !Array.isArray(result.data)) {
        const items = result.data.items || [];
        this.promotionsPage.set(nextPage);
        this.promotions.update((existing) => {
          const seen = new Set(existing.map((p) => p.id));
          return [...existing, ...items.filter((p) => !seen.has(p.id))];
        });
        this.promotionsTotal.set(result.data.pagination?.total ?? this.promotions().length);
      }
    } catch {
      // Keep currently displayed promotions on transient failure.
    } finally {
      this.promotionsLoadingMore.set(false);
    }
  }

  private businessSchema(data: MarketplaceBusinessDetail): Record<string, unknown> {
    const address = data.business.address;
    const location = data.business.location;
    return {
      '@type': address ? 'LocalBusiness' : 'Organization',
      '@id': this.seo.canonicalUrl(pathForBusiness(data.business.business_slug)) + '#business',
      name: data.storefront.title || data.business.business_name,
      description: data.storefront.description || data.business.business_description || undefined,
      url: this.seo.canonicalUrl(pathForBusiness(data.business.business_slug)),
      ...(data.business.business_phone ? { telephone: data.business.business_phone } : {}),
      ...(data.business.business_email ? { email: data.business.business_email } : {}),
      ...(address
        ? {
            address: {
              '@type': 'PostalAddress',
              ...(address.address_line_1
                ? {
                    streetAddress: [address.address_line_1, address.address_line_2]
                      .filter(Boolean)
                      .join(', '),
                  }
                : {}),
              ...(address.city ? { addressLocality: address.city } : {}),
              ...(address.state ? { addressRegion: address.state } : {}),
              ...(address.postal_code ? { postalCode: address.postal_code } : {}),
              ...(address.country_code ? { addressCountry: address.country_code } : {}),
            },
          }
        : {}),
      ...(location?.latitude != null && location?.longitude != null
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: location.latitude,
              longitude: location.longitude,
            },
          }
        : {}),
    };
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  async shareStore(): Promise<void> {
    const detail = this.context.detail();
    if (!detail) return;
    const url = window.location.href;
    const title = this.brandName + ' | Official Storefront';
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: detail.storefront.description || detail.business.business_description || title,
          url,
        });
        this.shareFeedback.set('Store link shared.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        this.shareFeedback.set('Store link copied to clipboard.');
      } else {
        this.shareFeedback.set(url);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.shareFeedback.set(
        'Unable to share automatically. Copy the store URL from your browser.',
      );
    }
  }

  isWhatsAppAvailable(data: MarketplaceBusinessDetail): boolean {
    const country = data.business.address?.country_code ?? data.business.country_code;
    return this.whatsApp.isWhatsAppAvailable(
      data.business.whatsapp_number,
      data.storefront.whatsapp_enabled,
      country,
    );
  }

  whatsappUrl(data: MarketplaceBusinessDetail): string | null {
    const name = data.business.business_name || this.brandName;
    const country = data.business.address?.country_code ?? data.business.country_code;
    return this.whatsApp.buildBusinessEnquiryUrl(name, data.business.whatsapp_number, country);
  }

  hasDirections(data: MarketplaceBusinessDetail): boolean {
    const location = data.business.location;
    const address = data.business.address;
    return (
      (location?.latitude != null && location?.longitude != null) ||
      !!(address?.address_line_1 || address?.city || data.business.city)
    );
  }

  directionsUrl(data: MarketplaceBusinessDetail): string {
    const location = data.business.location;
    if (location?.latitude != null && location?.longitude != null) {
      return (
        'https://www.google.com/maps/dir/?api=1&destination=' +
        encodeURIComponent(location.latitude + ',' + location.longitude)
      );
    }
    const address = data.business.address;
    const parts = [
      address?.address_line_1,
      address?.address_line_2,
      address?.city,
      address?.state,
      address?.postal_code,
      address?.country_code,
    ].filter(Boolean);
    return (
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(
        parts.join(', ') || [data.business.city, data.business.state].filter(Boolean).join(', '),
      )
    );
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(date);
  }

  productRoute(product: ProductCardModel): string {
    return buildProductRouteSlug(product);
  }

  protected openProduct(product: ProductCardModel, businessSlug: string): void {
    if (product.offering_type === 'SERVICE') {
      void this.router.navigate(['/store', businessSlug, 'contact'], {
        queryParams: { subject: 'Service enquiry: ' + product.product_name },
      });
      return;
    }
    void this.router.navigate(['/store', businessSlug, 'products', this.productRoute(product)]);
  }

  protected openPromotionBusiness(promotion: PromotionCardModel): void {
    void this.router.navigate(['/store', promotion.business_slug]);
  }

  protected openBusiness(businessSlug: string): void {
    void this.router.navigate(['/store', businessSlug]);
  }

  protected openContact(businessSlug: string): void {
    void this.router.navigate(['/store', businessSlug, 'contact']);
  }
}

function pathForBusiness(slug: string): string {
  return '/store/' + encodeURIComponent(slug);
}
