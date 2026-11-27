import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  MarketplaceApiService,
  MarketplacePromotion,
} from '../../../core/marketplace/marketplace-api.service';
import { PromotionCard } from '../../../shared/components/promotion-card/promotion-card';
import { PageBannerComponent } from '../../../shared/components/page-banner/page-banner.component';
import { InfiniteScrollSentinelComponent } from '../../../shared/components/infinite-scroll-sentinel/infinite-scroll-sentinel.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { PromotionCardModel } from '../../../shared/models/marketplace-card.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-promotion-feed',
  imports: [
    PromotionCard,
    PageBannerComponent,
    InfiniteScrollSentinelComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './promotion-feed.html',
  styleUrl: './promotion-feed.scss',
})
export class PromotionFeed implements OnInit {
  private readonly api = inject(MarketplaceApiService);
  private readonly router = inject(Router);
  protected readonly promotions = signal<MarketplacePromotion[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = 6;
  protected readonly total = signal(0);
  protected readonly hasMore = computed(() => this.promotions().length < this.total());

  ngOnInit(): void {
    this.load();
  }

  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.page.update((p) => p + 1);
    this.load(true);
  }

  protected openPromotion(promotion: PromotionCardModel): void {
    void this.router.navigate(['/promotions', promotion.id]);
  }

  protected exploreProducts(): void {
    void this.router.navigate(['/products']);
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(date);
  }

  private load(append = false): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set('');
    this.api.listPublicPromotions(this.page(), this.pageSize).subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          if (!append) {
            this.error.set(response.msgArr?.join(' ') || 'Promotions are currently unavailable.');
            this.promotions.set([]);
            this.total.set(0);
          }
        } else {
          const items = response.data.items ?? [];
          if (append) {
            this.promotions.update((existing) => {
              const seen = new Set(existing.map((p) => p.id));
              return [...existing, ...items.filter((p) => !seen.has(p.id))];
            });
          } else {
            this.promotions.set(items);
          }
          this.total.set(response.data.pagination?.total ?? items.length);
        }
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        if (!append) {
          this.error.set('We could not load promotions. Please try again.');
        }
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }
}
