import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  MarketplaceApiService,
  MarketplaceBusinessDetail,
  MarketplaceCategory,
  MarketplaceProduct,
} from '../../core/marketplace/marketplace-api.service';
import { FilterDrawer } from '../../shared/filter-drawer/filter-drawer';
import { ProductCard } from '../../shared/components/product-card/product-card';
import {
  buildProductRouteSlug,
  mapMarketplaceProductToCardModel,
} from '../../shared/models/marketplace-card.mappers';
import type { ProductCardModel } from '../../shared/models/marketplace-card.models';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';
import { WhatsAppService } from '../../core/whatsapp/whatsapp.service';

type Section = 'products' | 'about' | 'contact';
type ProductSort = 'newest' | 'popular' | 'nearby' | 'price_low' | 'price_high' | 'name';
type ProductFilterValues = {
  categoryId: string;
  brand: string;
  city: string;
  state: string;
  minPrice: number | null;
  maxPrice: number | null;
  onlineOnly: boolean;
  variantsOnly: boolean;
  withImages: boolean;
};
type ProductFilterKey = keyof ProductFilterValues;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-storefront-section',
  imports: [FormsModule, RouterLink, FilterDrawer, ProductCard],
  templateUrl: './storefront-section.html',
  styleUrl: './storefront-section.scss',
})
export class StorefrontSection {
  readonly context = inject(StorefrontContextService);
  private readonly api = inject(MarketplaceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(StorefrontSeoService);
  private readonly whatsApp = inject(WhatsAppService);

  readonly section = this.route.snapshot.data['section'] as Section;
  readonly products = signal<MarketplaceProduct[]>([]);
  readonly productCards = computed<ProductCardModel[]>(() => {
    const detail = this.context.detail();
    return this.products().map((product) => mapMarketplaceProductToCardModel(product, detail));
  });
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly pagination = signal({ page: 1, page_size: 3, total: 0 });
  readonly skeletons = [1, 2, 3];
  readonly loadError = signal('');
  readonly categories = signal<MarketplaceCategory[]>([]);
  readonly filtersOpen = signal(false);
  readonly filterNotice = signal('');
  readonly appliedFilters = signal<ProductFilterValues>(this.defaultFilters());
  draftFilters: ProductFilterValues = this.defaultFilters();
  sort: ProductSort = 'newest';
  readonly activeFilterChips = computed(() => {
    const filters = this.appliedFilters();
    const chips: { key: ProductFilterKey; label: string }[] = [];
    if (filters.categoryId) {
      const category = this.categories().find((item) => String(item.id) === filters.categoryId);
      chips.push({ key: 'categoryId', label: category?.category_name ?? 'Category selected' });
    }
    if (filters.brand.trim()) chips.push({ key: 'brand', label: 'Brand: ' + filters.brand.trim() });
    if (filters.city.trim()) chips.push({ key: 'city', label: 'City: ' + filters.city.trim() });
    if (filters.state.trim()) chips.push({ key: 'state', label: 'State: ' + filters.state.trim() });
    if (filters.minPrice !== null)
      chips.push({ key: 'minPrice', label: 'Min: ' + this.formatPrice(filters.minPrice) });
    if (filters.maxPrice !== null)
      chips.push({ key: 'maxPrice', label: 'Max: ' + this.formatPrice(filters.maxPrice) });
    if (filters.onlineOnly) chips.push({ key: 'onlineOnly', label: 'BCN accredited' });
    if (filters.variantsOnly) chips.push({ key: 'variantsOnly', label: 'Variants' });
    if (filters.withImages) chips.push({ key: 'withImages', label: 'With images' });
    return chips;
  });
  readonly activeFilterCount = computed(() => this.activeFilterChips().length);
  private latitude: number | undefined;
  private longitude: number | undefined;
  private queryPage = 1;
  private querySearch = '';

  get brandName(): string {
    const detail = this.context.detail();
    return detail?.storefront.title || detail?.business.business_name || 'Business';
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.pagination().total / Math.max(1, this.pagination().page_size)),
    );
  }

  get resultStart(): number {
    return this.pagination().total
      ? (this.pagination().page - 1) * this.pagination().page_size + 1
      : 0;
  }

  get resultEnd(): number {
    return Math.min(this.pagination().page * this.pagination().page_size, this.pagination().total);
  }

  private initializedSlug = '';

  constructor() {
    this.api.listPublicProductCategories().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS' && response.data && !Array.isArray(response.data))
          this.categories.set(response.data.items ?? []);
      },
      error: () => this.categories.set([]),
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const page = Math.max(1, Number(params.get('page')) || 1);
      const search = params.get('q') || '';
      const changed = page !== this.queryPage || search !== this.querySearch;
      this.queryPage = page;
      this.querySearch = search;
      this.searchTerm.set(search);
      if (changed && this.context.detail() && this.section === 'products') {
        void this.loadProducts(page, search);
      }
    });

    effect(() => {
      const detail = this.context.detail();
      if (!detail) return;
      const slug = detail.business.business_slug;
      if (!slug || this.initializedSlug === slug) return;
      this.initializedSlug = slug;
      void this.initializeSection(detail);
    });
  }

  private async initializeSection(detail: MarketplaceBusinessDetail): Promise<void> {
    const slug = detail.business.business_slug;
    const name = detail.storefront.title || detail.business.business_name;
    const path = '/store/' + encodeURIComponent(slug) + '/' + this.section;
    const canonicalUrl = this.seo.canonicalUrl(path);

    if (this.section === 'products') {
      if (detail.storefront.catalogue_enabled === false) {
        void this.router.navigate(['/store', slug], { replaceUrl: true });
        return;
      }
      await this.loadProducts(this.queryPage, this.querySearch);
      const description =
        'Browse products published by ' +
        name +
        '. View product information and contact the business for details.';
      const items = this.products().map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.product_name,
        url: canonicalUrl + '/' + this.productRoute(product),
      }));
      this.seo.update('Products | ' + name, description, path, {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Products | ' + name,
        description,
        url: canonicalUrl,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: this.pagination().total,
          itemListElement: items,
        },
        about: this.businessSchema(detail),
      });
      return;
    }

    this.loading.set(false);
    const isAbout = this.section === 'about';
    const description = isAbout
      ? detail.storefront.description ||
        detail.business.business_description ||
        'Learn more about ' + name + ' and its published business information.'
      : 'Contact ' + name + ' using its published business contact details and business address.';
    this.seo.update(
      (isAbout ? 'About ' : 'Contact ') + name + ' | Official Storefront',
      description,
      path,
      {
        '@context': 'https://schema.org',
        '@type': isAbout ? 'AboutPage' : 'ContactPage',
        name: (isAbout ? 'About ' : 'Contact ') + name,
        description,
        url: canonicalUrl,
        mainEntity: this.businessSchema(detail),
      },
    );
  }

  private defaultFilters(): ProductFilterValues {
    return {
      categoryId: '',
      brand: '',
      city: '',
      state: '',
      minPrice: null,
      maxPrice: null,
      onlineOnly: false,
      variantsOnly: false,
      withImages: false,
    };
  }

  setFiltersOpen(open: boolean): void {
    this.draftFilters = { ...this.appliedFilters() };
    if (open) this.filterNotice.set('');
    this.filtersOpen.set(open);
  }

  applyFilters(): void {
    if (
      this.draftFilters.minPrice !== null &&
      this.draftFilters.maxPrice !== null &&
      this.draftFilters.minPrice > this.draftFilters.maxPrice
    ) {
      this.filterNotice.set('Minimum price cannot be greater than maximum price.');
      return;
    }
    this.filterNotice.set('');
    this.appliedFilters.set({ ...this.draftFilters });
    this.filtersOpen.set(false);
    this.queryPage = 1;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1 },
      queryParamsHandling: 'merge',
    });
    if (this.sort === 'nearby' && (this.latitude === undefined || this.longitude === undefined)) {
      this.requestLocation();
      return;
    }
    void this.loadProducts(1, this.searchTerm());
  }

  resetDraftFilters(): void {
    this.draftFilters = this.defaultFilters();
    this.filterNotice.set('');
  }

  removeFilter(key: ProductFilterKey): void {
    const next = { ...this.appliedFilters() };
    switch (key) {
      case 'categoryId':
        next.categoryId = '';
        break;
      case 'brand':
        next.brand = '';
        break;
      case 'city':
        next.city = '';
        break;
      case 'state':
        next.state = '';
        break;
      case 'minPrice':
        next.minPrice = null;
        break;
      case 'maxPrice':
        next.maxPrice = null;
        break;
      case 'onlineOnly':
        next.onlineOnly = false;
        break;
      case 'variantsOnly':
        next.variantsOnly = false;
        break;
      case 'withImages':
        next.withImages = false;
        break;
    }
    this.appliedFilters.set(next);
    this.draftFilters = { ...next };
    this.queryPage = 1;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1 },
      queryParamsHandling: 'merge',
    });
    void this.loadProducts(1, this.searchTerm());
  }

  clearFilters(): void {
    this.appliedFilters.set(this.defaultFilters());
    this.draftFilters = this.defaultFilters();
    this.filterNotice.set('');
    this.queryPage = 1;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1 },
      queryParamsHandling: 'merge',
    });
    void this.loadProducts(1, this.searchTerm());
  }

  clearAllFilters(): void {
    this.sort = 'newest';
    this.latitude = undefined;
    this.longitude = undefined;
    this.appliedFilters.set(this.defaultFilters());
    this.draftFilters = this.defaultFilters();
    this.filterNotice.set('');
    this.searchTerm.set('');
    this.queryPage = 1;
    this.querySearch = '';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1, q: null },
      queryParamsHandling: 'merge',
    });
    void this.loadProducts(1, '');
  }

  sortChanged(value: ProductSort): void {
    this.sort = value;
    this.queryPage = 1;
    this.filterNotice.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1 },
      queryParamsHandling: 'merge',
    });
    if (value === 'nearby') {
      this.requestLocation();
      return;
    }
    this.latitude = undefined;
    this.longitude = undefined;
    void this.loadProducts(1, this.searchTerm());
  }

  private requestLocation(): void {
    if (!navigator.geolocation) {
      this.sort = 'newest';
      this.filterNotice.set(
        'Your browser does not support location access. Showing newly added products instead.',
      );
      void this.loadProducts(1, this.searchTerm());
      return;
    }
    this.loading.set(true);
    this.filterNotice.set('Allow location access to sort products by distance.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.filterNotice.set(
          'Showing products nearest to your current location. Location is used only for this search.',
        );
        void this.loadProducts(1, this.searchTerm());
      },
      () => {
        this.sort = 'newest';
        this.latitude = undefined;
        this.longitude = undefined;
        this.filterNotice.set(
          'Location access was unavailable. Showing newly added products; you can still filter by city or state.',
        );
        void this.loadProducts(1, this.searchTerm());
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  private formatPrice(value: number | string): string {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2,
        }).format(amount)
      : 'Price unavailable';
  }

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1, q: this.searchTerm().trim() || null },
      queryParamsHandling: 'merge',
    });
  }

  clearSearch(): void {
    this.searchTerm.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1, q: null },
      queryParamsHandling: 'merge',
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || this.loading()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page, q: this.searchTerm().trim() || null },
      queryParamsHandling: 'merge',
    });
  }

  async loadProducts(page: number, search = this.searchTerm()): Promise<void> {
    const slug = this.context.detail()?.business.business_slug;
    if (!slug) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set('');
    this.searchTerm.set(search);
    try {
      const applied = this.appliedFilters();
      const filters = {
        ...(applied.categoryId ? { category_id: Number(applied.categoryId) } : {}),
        brand: applied.brand.trim(),
        city: applied.city.trim(),
        state: applied.state.trim(),
        ...(applied.minPrice !== null ? { min_price: applied.minPrice } : {}),
        ...(applied.maxPrice !== null ? { max_price: applied.maxPrice } : {}),
        online_only: applied.onlineOnly,
        variants_only: applied.variantsOnly,
        with_images: applied.withImages,
        sort: this.sort,
        ...(this.sort === 'nearby' && this.latitude !== undefined && this.longitude !== undefined
          ? { latitude: this.latitude, longitude: this.longitude }
          : {}),
      };
      const response = await firstValueFrom(
        this.api.listStorefrontProducts(slug, page, 3, search.trim(), filters),
      );
      if (response.status === 'SUCCESS' && !Array.isArray(response.data)) {
        const items = (response.data.items || []).slice(0, 3);
        this.products.set(items);
        this.pagination.set(
          response.data.pagination || {
            page,
            page_size: 3,
            total: items.length,
          },
        );
      } else {
        this.products.set([]);
        this.pagination.set({ page: 1, page_size: 3, total: 0 });
        this.loadError.set('The product catalogue is currently unavailable. Please try again.');
      }
    } catch {
      this.products.set([]);
      this.pagination.set({ page: 1, page_size: 3, total: 0 });
      this.loadError.set('We could not load the product catalogue. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected openProduct(product: ProductCardModel, businessSlug: string): void {
    void this.router.navigate(['/store', businessSlug, 'products', this.productRoute(product)]);
  }

  protected openBusiness(businessSlug: string): void {
    void this.router.navigate(['/store', businessSlug]);
  }

  productRoute(product: ProductCardModel): string {
    return buildProductRouteSlug(product);
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

  mapsUrl(data: MarketplaceBusinessDetail): string {
    const address = data.business.address;
    const query = [
      address?.address_line_1,
      address?.address_line_2,
      address?.city,
      address?.state,
      address?.postal_code,
      address?.country_code,
    ]
      .filter(Boolean)
      .join(', ');
    if (data.business.location?.latitude != null && data.business.location?.longitude != null) {
      return (
        'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(data.business.location.latitude + ',' + data.business.location.longitude)
      );
    }
    return (
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(query || data.business.business_name)
    );
  }

  private businessSchema(data: MarketplaceBusinessDetail): Record<string, unknown> {
    const address = data.business.address;
    const location = data.business.location;
    return {
      '@type': address ? 'LocalBusiness' : 'Organization',
      '@id':
        this.seo.canonicalUrl('/store/' + encodeURIComponent(data.business.business_slug)) +
        '#business',
      name: data.storefront.title || data.business.business_name,
      url: this.seo.canonicalUrl('/store/' + encodeURIComponent(data.business.business_slug)),
      description: data.storefront.description || data.business.business_description || undefined,
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
}
