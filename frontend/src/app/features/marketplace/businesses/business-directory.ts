import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FilterDrawer } from '../../../shared/filter-drawer/filter-drawer';
import { BusinessCard } from '../../../shared/components/business-card/business-card';
import { PageBannerComponent } from '../../../shared/components/page-banner/page-banner.component';
import { InfiniteScrollSentinelComponent } from '../../../shared/components/infinite-scroll-sentinel/infinite-scroll-sentinel.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { mapMarketplaceBusinessToCardModel } from '../../../shared/models/marketplace-card.mappers';
import type { BusinessCardModel } from '../../../shared/models/marketplace-card.models';
import {
  MarketplaceApiService,
  MarketplaceBusiness,
  MarketplaceCategory,
} from '../../../core/marketplace/marketplace-api.service';

type BusinessFilterKey = 'categoryId' | 'city' | 'state';
interface BusinessFilterValues {
  categoryId: string;
  city: string;
  state: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-business-directory',
  imports: [
    FormsModule,
    FilterDrawer,
    BusinessCard,
    PageBannerComponent,
    InfiniteScrollSentinelComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './business-directory.html',
  styleUrl: './business-directory.scss',
})
export class BusinessDirectory implements OnInit {
  private readonly api = inject(MarketplaceApiService);
  private readonly router = inject(Router);
  protected query = '';
  protected readonly filtersOpen = signal(false);
  protected draftFilters: BusinessFilterValues = this.defaultFilters();
  private readonly appliedFilters = signal<BusinessFilterValues>(this.defaultFilters());
  protected readonly activeFilterChips = computed(() => {
    const filters = this.appliedFilters();
    const chips: { key: BusinessFilterKey; label: string }[] = [];
    if (filters.categoryId) {
      const category = this.categories().find((item) => String(item.id) === filters.categoryId);
      chips.push({ key: 'categoryId', label: category?.category_name ?? 'Category selected' });
    }
    if (filters.city.trim()) chips.push({ key: 'city', label: 'City: ' + filters.city.trim() });
    if (filters.state.trim()) chips.push({ key: 'state', label: 'State: ' + filters.state.trim() });
    return chips;
  });
  protected readonly activeFilterCount = computed(() => this.activeFilterChips().length);
  protected readonly categories = signal<MarketplaceCategory[]>([]);
  protected readonly businesses = signal<MarketplaceBusiness[]>([]);
  protected readonly businessCards = computed<BusinessCardModel[]>(() =>
    this.businesses().map((business) => mapMarketplaceBusinessToCardModel(business)),
  );
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal('');
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 6;
  protected readonly hasMore = computed(() => this.businesses().length < this.total());
  protected readonly heading = signal('All businesses');

  ngOnInit(): void {
    this.load();
    this.api.listPublicCategories().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS' && response.data && !Array.isArray(response.data)) {
          this.categories.set(response.data.items ?? []);
        }
      },
      error: () => {
        // Keep the directory usable if category metadata is temporarily unavailable.
        this.categories.set([]);
      },
    });
  }

  protected search(): void {
    this.page.set(1);
    this.load();
  }

  protected openBusiness(business: BusinessCardModel): void {
    void this.router.navigate(['/store', business.business_slug]);
  }

  protected setFiltersOpen(open: boolean): void {
    this.draftFilters = { ...this.appliedFilters() };
    this.filtersOpen.set(open);
  }

  protected applyFilters(): void {
    this.appliedFilters.set({ ...this.draftFilters });
    this.filtersOpen.set(false);
    this.page.set(1);
    this.load();
  }

  protected resetDraftFilters(): void {
    const defaults = this.defaultFilters();
    this.draftFilters = { ...defaults };
    this.appliedFilters.set({ ...defaults });
    this.filtersOpen.set(false);
    this.page.set(1);
    this.load();
  }

  protected removeFilter(key: BusinessFilterKey): void {
    const next = { ...this.appliedFilters() };
    if (key === 'categoryId') next.categoryId = '';
    if (key === 'city') next.city = '';
    if (key === 'state') next.state = '';
    this.appliedFilters.set(next);
    this.draftFilters = { ...next };
    this.page.set(1);
    this.load();
  }

  protected clearFilters(): void {
    this.appliedFilters.set(this.defaultFilters());
    this.draftFilters = this.defaultFilters();
    this.page.set(1);
    this.load();
  }

  private defaultFilters(): BusinessFilterValues {
    return { categoryId: '', city: '', state: '' };
  }
  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.page.update((p) => p + 1);
    this.load(true);
  }
  protected location(business: MarketplaceBusiness): string {
    return [business.city, business.state].filter(Boolean).join(', ') || 'Location not provided';
  }

  private load(append = false): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set('');
    const applied = this.appliedFilters();
    const filters = {
      search: this.query.trim(),
      city: applied.city.trim(),
      state: applied.state.trim(),
      ...(applied.categoryId ? { category_id: Number(applied.categoryId) } : {}),
    };
    const hasFilters = Boolean(
      filters.search || filters.city || filters.state || filters.category_id,
    );
    this.heading.set(hasFilters ? 'Filtered businesses' : 'All businesses');
    this.api.listBusinesses(filters, this.page(), this.pageSize).subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          if (!append) {
            this.error.set(
              response.msgArr?.join(' ') || 'Business listings are currently unavailable.',
            );
            this.businesses.set([]);
            this.total.set(0);
          }
        } else {
          const data = response.data;
          const items = data.items ?? [];
          if (append) {
            this.businesses.update((existing) => {
              const seen = new Set(existing.map((b) => b.id));
              return [...existing, ...items.filter((b) => !seen.has(b.id))];
            });
          } else {
            this.businesses.set(items);
          }
          this.total.set(data.pagination?.total ?? items.length);
        }
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        if (!append) {
          this.error.set('We could not load businesses. Please try again.');
        }
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }
}
