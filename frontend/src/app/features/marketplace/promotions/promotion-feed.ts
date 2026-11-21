import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  MarketplaceApiService,
  MarketplacePromotion,
} from '../../../core/marketplace/marketplace-api.service';
import { PromotionCard } from '../../../shared/components/promotion-card/promotion-card';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import type { PromotionCardModel } from '../../../shared/models/marketplace-card.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-promotion-feed',
  imports: [PromotionCard, PaginationComponent, SkeletonLoaderComponent, EmptyStateComponent],
  templateUrl: './promotion-feed.html',
  styleUrl: './promotion-feed.scss',
})
export class PromotionFeed implements OnInit {
  private readonly api = inject(MarketplaceApiService);
  private readonly router = inject(Router);
  protected readonly promotions = signal<MarketplacePromotion[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = 3;
  protected readonly total = signal(0);

  ngOnInit(): void {
    this.load();
  }

  protected changePage(nextPage: number): void {
    this.page.set(nextPage);
    this.load();
  }

  protected openBusiness(promotion: PromotionCardModel): void {
    void this.router.navigate(['/store', promotion.business_slug]);
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

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.listPublicPromotions(this.page(), this.pageSize).subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.error.set(response.msgArr?.join(' ') || 'Promotions are currently unavailable.');
          this.promotions.set([]);
          this.total.set(0);
        } else {
          const items = response.data.items ?? [];
          this.promotions.set(items.slice(0, this.pageSize));
          this.total.set(response.data.pagination?.total ?? items.length);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('We could not load promotions. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
