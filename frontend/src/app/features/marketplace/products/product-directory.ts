import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MarketplaceApiService,
  MarketplaceCategory,
  MarketplaceProduct,
} from '../../../core/marketplace/marketplace-api.service';
import { FilterDrawer } from '../../../shared/filter-drawer/filter-drawer';
import { ProductCard } from '../../../shared/components/product-card/product-card';
import { PageBannerComponent } from '../../../shared/components/page-banner/page-banner.component';
import { InfiniteScrollSentinelComponent } from '../../../shared/components/infinite-scroll-sentinel/infinite-scroll-sentinel.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  buildProductRouteSlug,
  mapMarketplaceProductToCardModel,
} from '../../../shared/models/marketplace-card.mappers';
import type { ProductCardModel } from '../../../shared/models/marketplace-card.models';

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
  selector: 'app-product-directory',
  imports: [
    FormsModule,
    FilterDrawer,
    ProductCard,
    PageBannerComponent,
    InfiniteScrollSentinelComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './product-directory.html',
  styleUrl: './product-directory.scss',
})
export class ProductDirectory implements OnInit {
  private readonly api = inject(MarketplaceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected openProduct(product: ProductCardModel): void {
    const productId = buildProductRouteSlug(product);
    void this.router.navigate(['/store', product.business.business_slug, 'products', productId]);
  }

  protected openBusiness(businessSlug: string): void {
    void this.router.navigate(['/store', businessSlug]);
  }

  protected query = '';
  protected sort: ProductSort = 'newest';
  protected readonly filtersOpen = signal(false);
  protected draftFilters: ProductFilterValues = this.defaultFilters();
  private readonly appliedFilters = signal<ProductFilterValues>(this.defaultFilters());
  protected readonly activeFilterChips = computed(() => {
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
  protected readonly activeFilterCount = computed(() => this.activeFilterChips().length);
  protected readonly categories = signal<MarketplaceCategory[]>([]);
  protected readonly products = signal<MarketplaceProduct[]>([]);
  protected readonly productCards = computed<ProductCardModel[]>(() =>
    this.products().map((product) => mapMarketplaceProductToCardModel(product)),
  );
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal('');
  protected readonly filterNotice = signal('');
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 6;
  protected readonly hasMore = computed(() => this.products().length < this.total());
  private latitude: number | undefined;
  private longitude: number | undefined;

  ngOnInit(): void {
    const category = this.route.snapshot.queryParamMap.get('category_id');
    if (category && /^\d+$/.test(category)) {
      this.appliedFilters.update((filters) => ({ ...filters, categoryId: category }));
      this.draftFilters = { ...this.appliedFilters() };
    }
    this.api.listPublicProductCategories().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS' && response.data && !Array.isArray(response.data)) {
          this.categories.set(response.data.items ?? []);
        }
      },
      error: () => this.categories.set([]),
    });
    this.load();
  }

  protected setFiltersOpen(open: boolean): void {
    if (open) {
      this.draftFilters = { ...this.appliedFilters() };
      this.filterNotice.set('');
    } else {
      this.draftFilters = { ...this.appliedFilters() };
    }
    this.filtersOpen.set(open);
  }

  protected applySearch(): void {
    this.page.set(1);
    this.load();
  }

  protected applyFilters(): void {
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
    this.page.set(1);
    if (this.sort === 'nearby' && (this.latitude === undefined || this.longitude === undefined)) {
      this.requestLocation();
      return;
    }
    this.load();
  }

  protected resetDraftFilters(): void {
    const defaults = this.defaultFilters();
    this.draftFilters = { ...defaults };
    this.appliedFilters.set({ ...defaults });
    this.filterNotice.set('');
    this.filtersOpen.set(false);
    this.page.set(1);
    this.load();
  }

  protected removeFilter(key: ProductFilterKey): void {
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
    this.page.set(1);
    this.load();
  }

  protected clearFilters(): void {
    this.appliedFilters.set(this.defaultFilters());
    this.draftFilters = this.defaultFilters();
    this.filterNotice.set('');
    this.page.set(1);
    this.load();
  }

  protected clearAllFilters(): void {
    this.query = '';
    this.sort = 'newest';
    this.latitude = undefined;
    this.longitude = undefined;
    this.clearFilters();
  }

  protected sortChanged(value: ProductSort): void {
    this.sort = value;
    this.page.set(1);
    this.filterNotice.set('');
    if (value === 'nearby') {
      this.requestLocation();
      return;
    }
    this.latitude = undefined;
    this.longitude = undefined;
    this.load();
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

  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.page.update((p) => p + 1);
    this.load(true);
  }

  protected load(append = false): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set('');
    const applied = this.appliedFilters();
    const filters = {
      search: this.query.trim(),
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
    this.api.listProducts(filters, this.page(), this.pageSize).subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          if (!append) {
            this.error.set(
              response.msgArr?.join(' ') || 'Product listings are currently unavailable.',
            );
            this.products.set([]);
            this.total.set(0);
          }
        } else {
          const data = response.data;
          const items = data.items ?? [];
          if (append) {
            this.products.update((existing) => {
              const seen = new Set(existing.map((p) => p.id));
              return [...existing, ...items.filter((p) => !seen.has(p.id))];
            });
          } else {
            this.products.set(items);
          }
          this.total.set(data.pagination?.total ?? items.length);
        }
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        if (!append) {
          this.error.set('We could not load products. Please try again.');
        }
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  protected formatPrice(value: number | string): string {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2,
        }).format(amount)
      : 'Price unavailable';
  }

  private requestLocation(): void {
    if (!navigator.geolocation) {
      this.sort = 'newest';
      this.filterNotice.set(
        'Your browser does not support location access. Showing newly added products instead.',
      );
      this.load();
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
        this.load();
      },
      () => {
        this.sort = 'newest';
        this.latitude = undefined;
        this.longitude = undefined;
        this.filterNotice.set(
          'Location access was unavailable. Showing newly added products; you can still filter by city or state.',
        );
        this.load();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }
}
