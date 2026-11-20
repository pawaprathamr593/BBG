import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthDialogService } from '../../../core/auth/auth-dialog.service';
import { BusinessRegistrationApiService } from '../../../core/business/business-registration-api.service';
import { MarketplaceApiService, MarketplaceBusiness, MarketplaceCategory, MarketplaceProduct, MarketplacePromotion, MarketplaceHomeStats } from '../../../core/marketplace/marketplace-api.service';
import { BusinessCard } from '../../../shared/components/business-card/business-card';
import { ProductCard } from '../../../shared/components/product-card/product-card';
import { PromotionCard } from '../../../shared/components/promotion-card/promotion-card';
import type { BusinessCardModel, ProductCardModel, PromotionCardModel } from '../../../shared/models/marketplace-card.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-marketplace-home',
  imports: [RouterLink, BusinessCard, ProductCard, PromotionCard],
  templateUrl: './marketplace-home.html',
  styleUrl: './marketplace-home.scss',
})
export class MarketplaceHome implements OnInit {
  private readonly marketplaceApi = inject(MarketplaceApiService);
  private readonly auth = inject(AuthService);
  private readonly authDialog = inject(AuthDialogService);
  private readonly businessApi = inject(BusinessRegistrationApiService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly searchLoading = signal(false);
  protected readonly searchError = signal('');
  protected readonly searchActive = signal(false);
  protected readonly categories = signal<MarketplaceCategory[]>([]);
  protected readonly businesses = signal<MarketplaceBusiness[]>([]);
  protected readonly recentBusinesses = signal<MarketplaceBusiness[]>([]);
  protected readonly recentProducts = signal<MarketplaceProduct[]>([]);
  protected readonly promotions = signal<MarketplacePromotion[]>([]);
  protected readonly homeStats = signal<MarketplaceHomeStats | null>(null);
  protected readonly statLabels = ['Public businesses', 'Platform users', 'Products listed', 'Orders completed'];

  protected async startBusinessRegistration(event: Event): Promise<void> {
    const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    if (await this.auth.restoreSession()) {
      await this.continueBusinessRegistration();
      return;
    }
    await this.authDialog.requireAuthentication(
      'Sign in to register your business',
      anchor,
      () => this.continueBusinessRegistration(),
      'login',
    );
  }

  private async continueBusinessRegistration(): Promise<void> {
    if (!this.auth.user()) await this.auth.loadProfile();
    const application = await this.businessApi.getMyApplication();
    await this.router.navigate([application ? '/workspace' : '/business/register']);
  }

  protected slugifyProduct(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
  }

  protected openBusiness(business: BusinessCardModel): void {
    void this.router.navigate(['/store', business.business_slug]);
  }

  protected openProduct(product: ProductCardModel): void {
    const slug = (product.slug || this.slugifyProduct(product.product_name)) + '-' + (product.public_id || product.id);
    void this.router.navigate(['/store', product.business.business_slug, 'products', slug]);
  }

  protected openBusinessSlug(businessSlug: string): void {
    void this.router.navigate(['/store', businessSlug]);
  }

  protected openPromotion(promotion: PromotionCardModel): void {
    void this.router.navigate(['/store', promotion.business_slug]);
  }

  ngOnInit(): void {
    this.loadHome();
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const query = String(formData.get('query') ?? '').trim();

    if (!query) {
      this.loadHome();
      return;
    }

    this.searchLoading.set(true);
    this.searchError.set('');
    this.searchActive.set(true);
    this.marketplaceApi.listBusinesses({ search: query }).subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.searchError.set(response.msgArr?.join(' ') || 'Unable to search businesses right now.');
          this.businesses.set([]);
        } else {
          this.businesses.set(response.data.items ?? []);
        }
        this.searchLoading.set(false);
      },
      error: () => {
        this.searchError.set('We could not reach the marketplace. Please try again.');
        this.searchLoading.set(false);
      },
    });
  }

  protected businessesHeading(): string {
    return this.searchActive() ? 'Business search results' : 'Most popular businesses';
  }

  protected businessesNote(): string {
    return this.searchActive() ? 'Matching published storefronts' : 'Ranked using recorded profile views and enquiries';
  }

  protected formatCount(value: number): string {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
  }

  protected formatPrice(value: number | string): string {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
      : String(value);
  }

  protected locationLabel(business: MarketplaceBusiness): string {
    return [business.city, business.state].filter(Boolean).join(', ') || 'Location not provided';
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  private loadProductCategories(): void {
    this.marketplaceApi.listPublicProductCategories().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS' && response.data && !Array.isArray(response.data)) {
          this.categories.set(response.data.items ?? []);
        } else {
          this.categories.set([]);
        }
      },
      error: () => this.categories.set([]),
    });
  }

  private loadHome(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.searchError.set('');
    this.searchActive.set(false);
    this.marketplaceApi.getHomeSummary().subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.loadError.set(response.msgArr?.join(' ') || 'Marketplace data is currently unavailable.');
          this.homeStats.set(null);
          this.categories.set([]);
          this.businesses.set([]);
          this.recentBusinesses.set([]);
          this.recentProducts.set([]);
          this.promotions.set([]);
        } else {
          this.homeStats.set(response.data.stats ?? null);
          this.loadProductCategories();
          this.businesses.set(response.data.popular_businesses ?? []);
          this.recentBusinesses.set(response.data.recent_businesses ?? []);
          this.recentProducts.set(response.data.recent_products ?? []);
          this.promotions.set(response.data.promotions ?? []);
        }
        this.loading.set(false);
        this.searchLoading.set(false);
      },
      error: () => {
        this.loadError.set('We could not load marketplace data. Please refresh the page to try again.');
        this.loading.set(false);
      },
    });
  }
}

