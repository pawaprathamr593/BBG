import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MarketplaceApiService, MarketplaceBusinessDetail, MarketplaceCategory, MarketplaceProduct } from '../../core/marketplace/marketplace-api.service';
import { FilterDrawer } from '../../shared/filter-drawer/filter-drawer';
import { ProductCard } from '../../shared/components/product-card/product-card';
import type { ProductCardModel } from '../../shared/models/marketplace-card.models';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

type Section = 'products' | 'about' | 'contact';
type ProductSort = 'newest' | 'popular' | 'nearby' | 'price_low' | 'price_high' | 'name';
type ProductFilterValues = { categoryId: string; brand: string; city: string; state: string; minPrice: number | null; maxPrice: number | null; onlineOnly: boolean; variantsOnly: boolean; withImages: boolean };
type ProductFilterKey = keyof ProductFilterValues;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-storefront-section',
  imports: [FormsModule, RouterLink, FilterDrawer, ProductCard],
  templateUrl: './storefront-section.html',
  styles: [`
    :host{display:block;color:var(--text-primary)}
    .page-shell{min-height:60vh;background:var(--surface-page)}
    .content-wrap{width:min(100% - 64px,1160px);margin:0 auto}
    .page-hero{position:relative;isolation:isolate;display:flex;min-height:340px;align-items:center;overflow:hidden;background:#123e2b;color:#fff}
    .hero-inner{width:min(100% - 64px,1160px);margin:0 auto;padding:72px 0}
    .eyebrow{display:flex;align-items:center;gap:12px;margin:0 0 22px;color:#d5e5da;font-size:.66rem;font-weight:800;letter-spacing:.16em}
    .eyebrow i{width:25px;height:1px;background:var(--accent)}
    .hero-inner h1{max-width:900px;margin:0 0 17px;color:#fff;font-size:clamp(3.2rem,7vw,5.7rem);font-weight:760;letter-spacing:-.075em;line-height:1.02}
    .hero-inner h1>span{color:#d7e8dc}
    .hero-inner h1>b,.products-hero h1>span,.contact-hero h1>span{color:var(--accent)}
    .hero-inner>p:last-child{max-width:670px;margin:0;color:#dce8df;font-size:1rem;line-height:1.8}
    .products-hero{min-height:330px}
    .about-hero{min-height:400px}
    .about-cover,.about-shade{position:absolute;z-index:-1;inset:0;width:100%;height:100%}
    .about-cover{object-fit:cover;opacity:.38}
    .about-shade{background:linear-gradient(90deg,#0d2e20f5 0%,#123e2bd9 55%,#123e2b72 100%)}
    .contact-hero{min-height:330px;background:radial-gradient(ellipse at 83% 20%,#397653 0%,transparent 36%),linear-gradient(115deg,#123e2b,#0e2b1e)}
    .section-label{margin:0 0 13px;color:var(--brand-strong);font-size:.63rem;font-weight:850;letter-spacing:.16em}
    .catalogue{padding-top:65px;padding-bottom:92px}
    .catalogue-toolbar{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:27px}
    .catalogue-toolbar h2{margin:0;font-size:clamp(1.6rem,3vw,2.2rem);letter-spacing:-.05em}
    .search-form{display:flex;width:min(100%,440px);min-height:48px;align-items:center;gap:8px;padding:4px 5px 4px 14px;border:1px solid var(--border);border-radius:7px;background:var(--surface-card)}
    .search-icon{color:var(--text-muted);font-size:1.5rem;line-height:1}
    .search-form input{width:100%;min-width:0;height:38px;border:0;outline:0;background:transparent;color:var(--text-primary);font-size:.83rem}
    .search-form input:focus-visible{outline:0}
    .search-button{min-height:38px;padding:0 17px;border:0;border-radius:5px;background:var(--brand);color:#fff;font-size:.75rem;font-weight:750;cursor:pointer}
    :host-context(html[data-theme="dark"]) .search-button{color:#17251c}
    .search-button:disabled{opacity:.6;cursor:wait}
    .clear-search{width:30px;height:30px;border:0;background:transparent;color:var(--text-muted);font-size:1.2rem;cursor:pointer}
    .catalogue-tools{display:flex;align-items:center;gap:9px}
    .sort-control{display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:.7rem;white-space:nowrap}
    .sort-control select{height:42px;max-width:180px;padding:0 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface-card);color:var(--text-primary);font-size:.75rem}
    .filter-trigger{display:inline-flex;min-height:42px;align-items:center;gap:8px;padding:0 13px;border:1px solid var(--border);border-radius:6px;background:var(--surface-card);color:var(--text-primary);font-size:.75rem;font-weight:650;cursor:pointer}
    .filter-trigger b{display:grid;min-width:19px;height:19px;place-items:center;border-radius:50%;background:var(--brand);color:#fff;font-size:.63rem}
    :host-context(html[data-theme="dark"]) .filter-trigger b{color:#17251c}
    .active-filters{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:-8px 0 22px}
    .active-filter-caption{color:var(--text-secondary);font-size:.69rem;font-weight:650}
    .filter-chip{display:inline-flex;min-height:29px;align-items:center;gap:7px;padding:4px 9px;border:1px solid var(--border);border-radius:999px;background:var(--brand-soft);color:var(--text-primary);font-size:.68rem;cursor:pointer}
    .filter-chip span{font-size:1rem;line-height:1}
    .clear-active-filters{padding:5px 7px;border:0;background:transparent;color:var(--brand-strong);font-size:.7rem;font-weight:700;cursor:pointer}
    .drawer-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:14px}
    .drawer-filters .check-field{grid-column:span 2}
    .filter-field{display:grid;gap:7px;min-width:0}
    .filter-field label{color:var(--text-secondary);font-size:.72rem;font-weight:650}
    .filter-field input,.filter-field select{width:100%;min-width:0;height:42px;padding:0 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.8rem}
    .check-field{display:flex;align-items:center;gap:9px;min-height:38px;color:var(--text-secondary);font-size:.74rem}
    .check-field input{width:16px;height:16px;accent-color:var(--brand)}
    .drawer-notice,.filter-notice{margin:0;padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--brand-soft);color:var(--text-secondary);font-size:.73rem;line-height:1.5}
    .drawer-notice{grid-column:1/-1}
    .filter-notice{margin:-8px 0 18px}
    .product-meta{display:block;margin-top:5px;color:var(--brand-strong);font-size:.66rem;font-weight:650}
    .results-summary{margin:0 0 18px;color:var(--text-secondary);font-size:.77rem}
    .results-summary span{color:var(--text-primary);font-weight:700}
    .catalogue-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:19px}
    .product-card{min-width:0;overflow:hidden;border:1px solid var(--border);border-radius:9px;background:var(--surface-card);color:var(--text-primary);text-decoration:none;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
    .product-card:hover{transform:translateY(-4px);border-color:var(--brand);box-shadow:0 15px 30px #102b2010}
    .product-art{position:relative;display:grid;min-height:195px;place-items:center;overflow:hidden;background:linear-gradient(145deg,#e8f1eb,#c9ddcf);color:#174d35}
    .product-art.art-alt{background:linear-gradient(145deg,#f5efcf,#e2dcae);color:#524b1a}
    .art-index{position:absolute;top:15px;left:16px;color:currentColor;font-size:.65rem;font-weight:850;opacity:.55}
    .art-monogram{position:relative;z-index:1;font-size:5.7rem;font-weight:820;letter-spacing:-.1em}
    .art-orbit{position:absolute;width:150px;height:150px;border:1px solid currentColor;border-radius:50%;opacity:.22}
    .art-orbit:after{position:absolute;inset:17px;border:1px solid currentColor;border-radius:50%;content:""}
    .art-category{position:absolute;right:12px;bottom:12px;max-width:75%;overflow:hidden;padding:6px 8px;border:1px solid #174d3520;border-radius:3px;background:#ffffffa8;color:#174d35;font-size:.55rem;font-weight:850;letter-spacing:.08em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
    .product-info{padding:16px}
    .product-title-row{display:flex;align-items:start;justify-content:space-between;gap:10px}
    .product-title-row h3{overflow:hidden;margin:0;font-size:.95rem;font-weight:760;text-overflow:ellipsis}
    .product-title-row>span{color:var(--brand-strong)}
    .product-brand{display:block;margin-top:6px;color:var(--text-muted);font-size:.72rem}
    .product-info>p{display:-webkit-box;min-height:42px;overflow:hidden;margin:11px 0 15px;color:var(--text-secondary);font-size:.75rem;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}
    .product-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:12px;border-top:1px solid var(--border)}
    .product-bottom strong{color:var(--brand-strong);font-size:.85rem}
    .product-bottom>span{color:var(--text-secondary);font-size:.74rem}
    .product-bottom small{color:var(--text-muted);font-size:.55rem;font-weight:850;letter-spacing:.1em}
    .pagination{display:flex;align-items:center;justify-content:center;gap:25px;margin-top:36px}
    .pagination a,.pagination .page-disabled{display:inline-flex;min-width:112px;min-height:42px;align-items:center;justify-content:center;padding:0 13px;border:1px solid var(--border);border-radius:6px;background:var(--surface-card);color:var(--text-primary);font-size:.77rem;font-weight:700;text-decoration:none}
    .pagination .page-disabled{opacity:.4}
    .pagination>span{color:var(--text-secondary);font-size:.76rem}.pagination strong{color:var(--text-primary)}
    .empty-state{display:flex;min-height:310px;align-items:center;flex-direction:column;justify-content:center;padding:35px 20px;border:1px dashed var(--border);border-radius:10px;text-align:center}
    .empty-icon{display:grid;width:54px;height:54px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-strong);font-size:1.8rem}
    .empty-state h2{margin:18px 0 7px;font-size:1.25rem;letter-spacing:-.03em}
    .empty-state p{max-width:480px;margin:0;color:var(--text-secondary);font-size:.83rem;line-height:1.7}
    .reset-button{margin-top:17px;padding:8px 14px;border:1px solid var(--border);border-radius:5px;background:var(--surface-card);color:var(--text-primary);font-size:.75rem;font-weight:700;cursor:pointer}
    .contact-text-link{margin-top:16px;color:var(--brand-strong);font-size:.77rem;font-weight:800;text-decoration:none}
    .product-skeleton{display:flex;flex-direction:column;gap:12px;padding:12px;border:1px solid var(--border);border-radius:9px}
    .product-skeleton span{height:180px;border-radius:5px;background:var(--surface-subtle)}
    .product-skeleton i{height:10px;border-radius:5px;background:var(--surface-subtle)}
    .product-skeleton i:nth-of-type(2){width:65%}.product-skeleton b{width:42%;height:13px;margin-top:7px;border-radius:5px;background:var(--surface-subtle)}
    .about-content{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.75fr);gap:90px;padding-top:83px;padding-bottom:90px}
    .business-identity{display:flex;align-items:center;gap:16px;margin:24px 0 42px}
    .business-identity img,.identity-mark{width:64px;height:64px;flex:0 0 64px;border:1px solid var(--border);border-radius:12px;object-fit:cover}
    .identity-mark{display:grid;place-items:center;background:var(--brand-soft);color:var(--brand-strong);font-size:1.6rem;font-weight:850}
    .business-identity h2{margin:0 0 5px;font-size:1.15rem;letter-spacing:-.03em}
    .business-identity p{margin:0;color:var(--text-secondary);font-size:.77rem}
    .about-main>h3{margin:0 0 13px;font-size:1.6rem;letter-spacing:-.04em}
    .business-description{max-width:690px;margin:0;color:var(--text-secondary);font-size:.96rem;line-height:1.95;white-space:pre-line}
    .location-note{display:flex;align-items:center;gap:14px;margin-top:35px;padding-top:23px;border-top:1px solid var(--border)}
    .location-note>span{display:grid;width:40px;height:40px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-strong);font-size:1.2rem}
    .location-note strong{font-size:.82rem}.location-note p{margin:5px 0 0;color:var(--text-secondary);font-size:.78rem}
    .about-aside{align-self:start;padding:26px;border:1px solid var(--border);border-radius:9px;background:var(--surface-card)}
    .about-aside .section-label{margin-bottom:20px}
    .detail-row{display:flex;justify-content:space-between;gap:15px;padding:14px 0;border-top:1px solid var(--border);font-size:.75rem}
    .detail-row>span{color:var(--text-secondary)}.detail-row strong{text-align:right;font-weight:700}
    .aside-link{display:flex;min-height:46px;align-items:center;justify-content:space-between;margin-top:17px;padding:0 14px;border-radius:5px;background:var(--brand);color:#fff;font-size:.78rem;font-weight:750;text-decoration:none}
    :host-context(html[data-theme="dark"]) .aside-link{color:#17251c}
    .about-cta,.contact-bottom{background:var(--brand-soft)}
    .cta-inner,.bottom-inner{display:flex;width:min(100% - 64px,1160px);min-height:240px;align-items:center;justify-content:space-between;gap:30px;margin:0 auto;padding:48px 0}
    .cta-inner h2,.bottom-inner h2{margin:0 0 9px;font-size:clamp(1.7rem,3.5vw,2.5rem);letter-spacing:-.055em}
    .cta-inner>div>p:last-child,.bottom-inner>div>p:last-child{margin:0;color:var(--text-secondary);font-size:.86rem;line-height:1.7}
    .cta-button{display:inline-flex;min-height:48px;align-items:center;gap:22px;padding:0 19px;border-radius:5px;background:var(--brand);color:#fff;font-size:.78rem;font-weight:750;text-decoration:none;white-space:nowrap}
    :host-context(html[data-theme="dark"]) .cta-button{color:#17251c}
    .contact-content{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(280px,.7fr);gap:80px;padding-top:75px;padding-bottom:88px}
    .contact-intro h2{max-width:580px;margin:0 0 12px;font-size:clamp(2rem,4vw,3rem);letter-spacing:-.065em;line-height:1.1}
    .contact-intro h2 em{color:var(--brand-strong);font-style:normal}
    .contact-intro>p:not(.section-label){margin:0;color:var(--text-secondary);font-size:.88rem;line-height:1.7}
    .contact-methods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:34px}
    .contact-card{display:flex;min-width:0;min-height:165px;flex-direction:column;align-items:flex-start;padding:19px;border:1px solid var(--border);border-radius:8px;background:var(--surface-card);color:var(--text-primary);text-decoration:none;transition:transform .18s ease,border-color .18s ease}
    .contact-card:hover{transform:translateY(-3px);border-color:var(--brand)}
    .method-icon{display:grid;width:36px;height:36px;place-items:center;margin-bottom:17px;border-radius:8px;background:var(--brand-soft);color:var(--brand-strong);font-size:1rem}
    .method-label{margin-bottom:7px;color:var(--text-muted);font-size:.58rem;font-weight:850;letter-spacing:.13em}
    .contact-card strong{overflow-wrap:anywhere;font-size:.9rem}
    .contact-card small{margin-top:7px;color:var(--text-secondary);font-size:.7rem;line-height:1.5}
    .no-contact{margin-top:32px;padding:20px;border:1px dashed var(--border);border-radius:8px;background:var(--surface-card)}
    .no-contact strong{font-size:.85rem}.no-contact p{margin:7px 0 0;color:var(--text-secondary);font-size:.78rem;line-height:1.65}
    .address-panel{align-self:start;padding:27px;border:1px solid var(--border);border-radius:9px;background:var(--surface-card)}
    .address-panel-top{display:flex;align-items:center;gap:12px}
    .address-icon{display:grid;width:40px;height:40px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-strong);font-size:1.2rem}
    .address-panel-top .section-label{margin:0}    .address-panel h2{margin:22px 0 13px;font-size:1.3rem;letter-spacing:-.04em}
    .address-panel address{display:grid;gap:5px;color:var(--text-secondary);font-size:.85rem;font-style:normal;line-height:1.6}
    .directions-link{display:flex;min-height:43px;align-items:center;justify-content:space-between;margin-top:24px;padding:0 13px;border:1px solid var(--border);border-radius:5px;color:var(--brand-strong);font-size:.77rem;font-weight:800;text-decoration:none}
    .address-unavailable{color:var(--text-secondary);font-size:.8rem;line-height:1.6}
    .address-location{margin-top:20px;padding-top:16px;border-top:1px solid var(--border);color:var(--text-muted);font-size:.74rem}
    .bottom-inner{min-height:220px}
    .bottom-actions{display:flex;flex-direction:column;gap:13px;min-width:205px}
    .bottom-actions a{display:flex;align-items:center;justify-content:space-between;gap:15px;color:var(--brand-strong);font-size:.8rem;font-weight:800;text-decoration:none}
    @media(max-width:1000px){.catalogue-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.catalogue-toolbar{align-items:flex-start;flex-direction:column}.search-form{width:100%}.about-content,.contact-content{gap:38px}.about-content{grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr)}.contact-content{grid-template-columns:minmax(0,1fr) minmax(260px,.75fr)}}
    @media(max-width:700px){.content-wrap,.hero-inner,.cta-inner,.bottom-inner{width:calc(100% - 40px)}.catalogue-tools{width:100%;justify-content:space-between}.sort-control{flex:1}.sort-control select{width:100%;max-width:none}.drawer-filters{grid-template-columns:1fr}.drawer-filters .check-field{grid-column:auto}.page-hero{min-height:300px}.hero-inner{padding:62px 0}.hero-inner h1{font-size:clamp(3rem,13vw,4.6rem)}.catalogue{padding-top:48px;padding-bottom:65px}.catalogue-toolbar{align-items:stretch;flex-direction:column}.search-form{width:100%}.catalogue-grid{gap:12px}.product-art{min-height:150px}.art-monogram{font-size:4.5rem}.product-info{padding:12px}.product-info>p{font-size:.7rem}.product-title-row h3{font-size:.85rem}.product-bottom small{display:none}.pagination{gap:10px}.pagination button{min-width:94px}.about-content,.contact-content{grid-template-columns:1fr;gap:35px;padding-top:55px;padding-bottom:62px}.business-identity{margin:20px 0 32px}.about-aside{padding:21px}.cta-inner,.bottom-inner{align-items:flex-start;flex-direction:column;justify-content:center;padding:40px 0}.cta-button{width:100%;justify-content:space-between}.contact-methods{grid-template-columns:1fr 1fr}.address-panel{padding:22px}.bottom-actions{width:100%}}
    @media(max-width:420px){.catalogue-grid{grid-template-columns:1fr}.product-art{min-height:210px}.art-monogram{font-size:5.7rem}.contact-methods{grid-template-columns:1fr}.contact-card{min-height:145px}.pagination{flex-wrap:wrap}.hero-decoration{display:none}}
    @media(prefers-reduced-motion:reduce){.product-card,.contact-card{transition:none}.product-card:hover,.contact-card:hover{transform:none}}
  `],
})
export class StorefrontSection {
  readonly context = inject(StorefrontContextService);
  private readonly api = inject(MarketplaceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(StorefrontSeoService);

  readonly section = this.route.snapshot.data['section'] as Section;
  readonly products = signal<MarketplaceProduct[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly pagination = signal({ page: 1, page_size: 12, total: 0 });
  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];
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
    if (filters.minPrice !== null) chips.push({ key: 'minPrice', label: 'Min: ' + this.formatPrice(filters.minPrice) });
    if (filters.maxPrice !== null) chips.push({ key: 'maxPrice', label: 'Max: ' + this.formatPrice(filters.maxPrice) });
    if (filters.onlineOnly) chips.push({ key: 'onlineOnly', label: 'Online orders' });
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
    return Math.max(1, Math.ceil(this.pagination().total / Math.max(1, this.pagination().page_size)));
  }

  get resultStart(): number {
    return this.pagination().total ? (this.pagination().page - 1) * this.pagination().page_size + 1 : 0;
  }

  get resultEnd(): number {
    return Math.min(this.pagination().page * this.pagination().page_size, this.pagination().total);
  }

  private initializedSlug = '';

  constructor() {
    this.api.listPublicProductCategories().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS' && response.data && !Array.isArray(response.data)) this.categories.set(response.data.items ?? []);
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
      await this.loadProducts(this.queryPage, this.querySearch);
      const description = 'Browse products published by ' + name + '. View product information and contact the business for details.';
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
      ? (detail.storefront.description || detail.business.business_description || 'Learn more about ' + name + ' and its published business information.')
      : 'Contact ' + name + ' using its published business contact details and business address.';
    this.seo.update((isAbout ? 'About ' : 'Contact ') + name + ' | Official Storefront', description, path, {
      '@context': 'https://schema.org',
      '@type': isAbout ? 'AboutPage' : 'ContactPage',
      name: (isAbout ? 'About ' : 'Contact ') + name,
      description,
      url: canonicalUrl,
      mainEntity: this.businessSchema(detail),
    });
  }

  private defaultFilters(): ProductFilterValues {
    return { categoryId: '', brand: '', city: '', state: '', minPrice: null, maxPrice: null, onlineOnly: false, variantsOnly: false, withImages: false };
  }

  setFiltersOpen(open: boolean): void {
    this.draftFilters = { ...this.appliedFilters() };
    if (open) this.filterNotice.set('');
    this.filtersOpen.set(open);
  }

  applyFilters(): void {
    if (this.draftFilters.minPrice !== null && this.draftFilters.maxPrice !== null
      && this.draftFilters.minPrice > this.draftFilters.maxPrice) {
      this.filterNotice.set('Minimum price cannot be greater than maximum price.');
      return;
    }
    this.filterNotice.set('');
    this.appliedFilters.set({ ...this.draftFilters });
    this.filtersOpen.set(false);
    this.queryPage = 1;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { page: 1 }, queryParamsHandling: 'merge' });
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
      case 'categoryId': next.categoryId = ''; break;
      case 'brand': next.brand = ''; break;
      case 'city': next.city = ''; break;
      case 'state': next.state = ''; break;
      case 'minPrice': next.minPrice = null; break;
      case 'maxPrice': next.maxPrice = null; break;
      case 'onlineOnly': next.onlineOnly = false; break;
      case 'variantsOnly': next.variantsOnly = false; break;
      case 'withImages': next.withImages = false; break;
    }
    this.appliedFilters.set(next);    this.draftFilters = { ...next };
    this.queryPage = 1;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { page: 1 }, queryParamsHandling: 'merge' });
    void this.loadProducts(1, this.searchTerm());
  }

  clearFilters(): void {
    this.appliedFilters.set(this.defaultFilters());
    this.draftFilters = this.defaultFilters();
    this.filterNotice.set('');
    this.queryPage = 1;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { page: 1 }, queryParamsHandling: 'merge' });
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
    void this.router.navigate([], { relativeTo: this.route, queryParams: { page: 1, q: null }, queryParamsHandling: 'merge' });
    void this.loadProducts(1, '');
  }

  sortChanged(value: ProductSort): void {
    this.sort = value;
    this.queryPage = 1;
    this.filterNotice.set('');
    void this.router.navigate([], { relativeTo: this.route, queryParams: { page: 1 }, queryParamsHandling: 'merge' });
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
      this.filterNotice.set('Your browser does not support location access. Showing newly added products instead.');
      void this.loadProducts(1, this.searchTerm());
      return;
    }
    this.loading.set(true);
    this.filterNotice.set('Allow location access to sort products by distance.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.filterNotice.set('Showing products nearest to your current location. Location is used only for this search.');
        void this.loadProducts(1, this.searchTerm());
      },
      () => {
        this.sort = 'newest';
        this.latitude = undefined;
        this.longitude = undefined;
        this.filterNotice.set('Location access was unavailable. Showing newly added products; you can still filter by city or state.');
        void this.loadProducts(1, this.searchTerm());
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  private formatPrice(value: number | string): string {
    const amount = Number(value);
    return Number.isFinite(amount) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount) : 'Price unavailable';
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
      const response = await firstValueFrom(this.api.listStorefrontProducts(slug, page, 12, search.trim(), filters));
      if (response.status === 'SUCCESS' && !Array.isArray(response.data)) {
        this.products.set(response.data.items || []);
        this.pagination.set(response.data.pagination || { page, page_size: 12, total: (response.data.items || []).length });
      } else {
        this.products.set([]);
        this.pagination.set({ page: 1, page_size: 12, total: 0 });
        this.loadError.set('The product catalogue is currently unavailable. Please try again.');
      }
    } catch {
      this.products.set([]);
      this.pagination.set({ page: 1, page_size: 12, total: 0 });
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
    const slug = product.slug || product.product_name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
    return slug + '-' + (product.public_id || product.id);
  }

  whatsappUrl(phone: string): string {
    return 'https://wa.me/' + phone.replace(/\D/g, '');
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
    ].filter(Boolean).join(', ');
    if (data.business.location?.latitude != null && data.business.location?.longitude != null) {
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(data.business.location.latitude + ',' + data.business.location.longitude);
    }
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query || data.business.business_name);
  }

  private businessSchema(data: MarketplaceBusinessDetail): Record<string, unknown> {
    const address = data.business.address;
    const location = data.business.location;
    return {
      '@type': address ? 'LocalBusiness' : 'Organization',
      '@id': this.seo.canonicalUrl('/store/' + encodeURIComponent(data.business.business_slug)) + '#business',
      name: data.storefront.title || data.business.business_name,
      url: this.seo.canonicalUrl('/store/' + encodeURIComponent(data.business.business_slug)),
      description: data.storefront.description || data.business.business_description || undefined,
      ...(data.business.business_phone ? { telephone: data.business.business_phone } : {}),
      ...(data.business.business_email ? { email: data.business.business_email } : {}),
      ...(address ? {
        address: {
          '@type': 'PostalAddress',
          ...(address.address_line_1 ? { streetAddress: [address.address_line_1, address.address_line_2].filter(Boolean).join(', ') } : {}),
          ...(address.city ? { addressLocality: address.city } : {}),
          ...(address.state ? { addressRegion: address.state } : {}),
          ...(address.postal_code ? { postalCode: address.postal_code } : {}),
          ...(address.country_code ? { addressCountry: address.country_code } : {}),
        },
      } : {}),
      ...(location?.latitude != null && location?.longitude != null ? {
        geo: { '@type': 'GeoCoordinates', latitude: location.latitude, longitude: location.longitude },
      } : {}),
    };
  }
}
