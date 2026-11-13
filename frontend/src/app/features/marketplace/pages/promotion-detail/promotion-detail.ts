import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../../../core/seo/seo.service';
import { MarketplacePromotionDetail } from '../../models/marketplace.models';
import { MarketplaceService } from '../../services/marketplace.service';

@Component({
  selector: 'app-promotion-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './promotion-detail.html',
  styleUrl: './promotion-detail.scss',
})
export class PromotionDetail implements OnInit {
  private readonly marketplace = inject(MarketplaceService);
  private readonly seo = inject(SeoService);
  private readonly promotionId = Number(inject(ActivatedRoute).snapshot.paramMap.get('promotionId'));
  protected readonly detail = signal<MarketplacePromotionDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    if (!Number.isInteger(this.promotionId) || this.promotionId < 1) {
      this.error.set('This promotion link is not valid.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const detail = await this.marketplace.getPromotion(this.promotionId);
      this.detail.set(detail);
      const promotion = detail.promotion;
      const description = promotion.post_content.slice(0, 300);
      this.seo.update(
        `${promotion.post_title} | ${promotion.business_name} | BBG`,
        description,
        `/promotions/${promotion.id}`,
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: promotion.post_title,
          description,
          datePublished: promotion.published_on,
          author: { '@type': 'Organization', name: promotion.business_name },
          url: `/promotions/${promotion.id}`,
        },
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load this promotion.');
    } finally { this.loading.set(false); }
  }
}
