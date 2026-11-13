import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarketplaceBusinessDetail } from '../../../features/marketplace/models/marketplace.models';
import { MarketplaceService } from '../../../features/marketplace/services/marketplace.service';
import { SeoService } from '../../seo/seo.service';
import { ThemeService } from '../../theme/theme.service';

@Component({
  selector: 'app-storefront-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './storefront-layout.html',
  styleUrl: './storefront-layout.scss',
})
export class StorefrontLayout implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly marketplace = inject(MarketplaceService);
  private readonly seo = inject(SeoService);
  protected readonly theme = inject(ThemeService);
  protected readonly detail = signal<MarketplaceBusinessDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly year = new Date().getFullYear();
  protected readonly slug = signal('');

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.slug.set(params.get('businessSlug') ?? '');
      void this.loadBusiness();
    });
  }

  protected async loadBusiness(): Promise<void> {
    const slug = this.slug();
    if (!slug) { this.error.set('This storefront address is incomplete.'); this.loading.set(false); return; }
    this.loading.set(true);
    this.error.set('');
    try {
      const detail = await this.marketplace.getBusiness(slug);
      if (slug !== this.slug()) return;
      this.detail.set(detail);
      this.seo.updateBusiness({
        name: detail.storefront.title || detail.business.business_name,
        description: detail.storefront.description || detail.business.business_description,
        url: `/businesses/${encodeURIComponent(slug)}`,
        city: detail.business.city,
        state: detail.business.state,
        phone: detail.business.business_phone,
        email: detail.business.business_email,
      });
    } catch (cause) {
      if (slug === this.slug()) this.error.set(cause instanceof Error ? cause.message : 'This storefront is not available right now.');
    } finally {
      if (slug === this.slug()) this.loading.set(false);
    }
  }

  protected get brandName(): string {
    const data = this.detail();
    return data?.storefront.title || data?.business.business_name || 'Business storefront';
  }

  protected get brandInitial(): string { return this.brandName.slice(0, 1).toUpperCase(); }
  protected get loginReturnUrl(): string { return this.router.url; }
}
