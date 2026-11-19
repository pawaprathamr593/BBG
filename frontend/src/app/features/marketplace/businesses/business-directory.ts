import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FilterDrawer } from '../../../shared/filter-drawer/filter-drawer';
import { BusinessCard } from '../../../shared/components/business-card/business-card';
import type { BusinessCardModel } from '../../../shared/models/marketplace-card.models';
import { MarketplaceApiService, MarketplaceBusiness, MarketplaceCategory } from '../../../core/marketplace/marketplace-api.service';

type BusinessFilterKey = 'categoryId' | 'city' | 'state';
interface BusinessFilterValues {
  categoryId: string;
  city: string;
  state: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-business-directory',
  imports: [FormsModule, FilterDrawer, BusinessCard],
  templateUrl: './business-directory.html',
  styles: [`
    :host{display:block}.page{min-height:65vh;padding:0 0 64px;background:var(--surface-page)}
    .intro{position:relative;isolation:isolate;overflow:hidden;padding:76px max(24px,calc((100vw - 1180px)/2)) 64px;color:#fff;background:radial-gradient(ellipse at 88% 12%,rgba(245,217,40,.22),transparent 27%),radial-gradient(ellipse at 8% 100%,rgba(107,174,126,.28),transparent 38%),linear-gradient(120deg,#0d3425,#174d35 58%,#246747);border-radius:0 0 26px 26px;box-shadow:0 18px 48px rgba(17,64,43,.12)}
    .intro::before{position:absolute;z-index:-1;top:-150px;right:7%;width:360px;height:360px;border:1px solid rgba(255,255,255,.17);border-radius:50%;box-shadow:0 0 0 34px rgba(255,255,255,.035),0 0 0 72px rgba(255,255,255,.025);content:""}.intro::after{position:absolute;z-index:-1;right:19%;bottom:-105px;width:190px;height:190px;background:rgba(245,217,40,.13);border-radius:50%;filter:blur(2px);content:""}.intro>*{position:relative;z-index:1}
    .eyebrow{margin:0 0 12px;color:#789987;font-size:.68rem;font-weight:800;letter-spacing:.16em}.intro .eyebrow{color:#c5d9ce}
    h1{max-width:850px;margin:0;font-size:clamp(2.8rem,6.5vw,5rem);font-weight:820;letter-spacing:-.075em;line-height:.99;text-wrap:balance}h1 span{color:#f5d928}
    .lead{max-width:650px;margin:20px 0 27px;color:rgba(255,255,255,.86);font-size:1.02rem;line-height:1.7}
    .empty button,.state button{padding:12px 16px;color:#171d19;background:#f5d928;border:0;border-radius:8px;font-weight:750;cursor:pointer}
    .toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:12px;margin:0 0 14px;padding:16px;background:var(--surface-card);border:1px solid var(--border);border-radius:15px;box-shadow:0 8px 24px rgba(20,35,27,.045)}
    .filter-field{display:grid;gap:7px;min-width:0}.filter-field label{color:var(--text-secondary);font-size:.72rem;font-weight:750}
    .filter-field input,.filter-field select{width:100%;min-width:0;height:42px;padding:0 11px;color:var(--text-primary);background:var(--surface-page);border:1px solid var(--border);border-radius:8px;font:inherit;font-size:.82rem;outline:none}
    .filter-field input:focus,.filter-field select:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
    .search-submit{height:42px;padding:0 20px;color:#17231b;background:#f5d928;border:1px solid #f5d928;border-radius:8px;font-size:.78rem;font-weight:800;cursor:pointer}
    .active-filters{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 22px}.active-filter-caption{color:var(--text-secondary);font-size:.72rem;font-weight:750}.filter-chip{display:inline-flex;align-items:center;gap:7px;min-height:30px;padding:5px 10px;color:#315d47;background:#edf4ef;border:1px solid #d8e7dc;border-radius:999px;font-size:.7rem;font-weight:700;cursor:pointer}.filter-chip span{font-size:1rem;line-height:1}.clear-active-filters{padding:5px 7px;color:var(--text-secondary);background:transparent;border:0;font-size:.72rem;font-weight:750;cursor:pointer}
    .drawer-filters{display:grid;grid-template-columns:1fr;gap:15px}.drawer-filters .filter-field input,.drawer-filters .filter-field select{height:44px}
    .results{width:min(1180px,calc(100% - 40px));margin:38px auto 0}.heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px}
    .heading .eyebrow{margin-bottom:6px}.heading h2{margin:0;color:var(--text-primary);font-size:1.65rem;letter-spacing:-.04em}.heading>span{color:var(--text-secondary);font-size:.8rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:16px}.card{padding:21px;background:var(--surface-card);border:1px solid var(--border);border-radius:15px}
    .card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px}.avatar{display:grid;width:46px;height:46px;place-items:center;color:#174d35;background:#e8f1eb;border-radius:13px;font-size:1.1rem;font-weight:850}
    .tag,.features span{padding:6px 9px;color:#315d47;background:#eaf2ec;border-radius:999px;font-size:.68rem;font-weight:700}
    .card h3{margin:0 0 5px;color:var(--text-primary);font-size:1.02rem}.location{margin:0;color:var(--text-secondary);font-size:.76rem}.description{min-height:3.8em;margin:13px 0;color:var(--text-secondary);font-size:.81rem;line-height:1.55}
    .features{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.features span{border-radius:6px}
    .card-action{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding:10px 12px;color:#174d35;background:#edf4ef;border:1px solid #d8e7dc;border-radius:9px;font-size:.78rem;font-weight:750;text-decoration:none;transition:background .18s ease,transform .18s ease}.card-action:hover{background:#e1eee5;transform:translateY(-1px)}.card-action span{font-size:1rem}
    .state,.empty{padding:30px;text-align:center;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:14px}.error{color:#a33}.empty{padding:44px 20px}.empty-mark{font-size:2.5rem;color:var(--brand)}.empty h3{margin:8px 0;color:var(--text-primary)}.empty p{margin:0 0 18px;font-size:.85rem}
    .pagination{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:24px;color:var(--text-secondary);font-size:.8rem}.pagination button{padding:9px 14px;color:var(--brand);background:var(--surface-card);border:1px solid var(--border);border-radius:8px;cursor:pointer}.pagination button:disabled{opacity:.4;cursor:not-allowed}
    .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
    @media(max-width:600px){.intro{padding:45px 20px}.heading{align-items:flex-start;flex-direction:column}.toolbar{grid-template-columns:1fr;padding:14px}.search-submit{width:100%}}
  `],
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
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 12;
  protected readonly pages = signal(1);
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

  protected search(): void { this.page.set(1); this.load(); }

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
  protected changePage(value: number): void { this.page.set(value); this.load(); }
  protected location(business: MarketplaceBusiness): string {
    return [business.city, business.state].filter(Boolean).join(', ') || 'Location not provided';
  }

  private load(): void {
    this.loading.set(true); this.error.set('');
    const applied = this.appliedFilters();
    const filters = {
      search: this.query.trim(),
      city: applied.city.trim(),
      state: applied.state.trim(),
      ...(applied.categoryId ? { category_id: Number(applied.categoryId) } : {}),
    };
    const hasFilters = Boolean(filters.search || filters.city || filters.state || filters.category_id);
    this.heading.set(hasFilters ? 'Filtered businesses' : 'All businesses');
    this.api.listBusinesses(filters, this.page(), this.pageSize).subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.error.set(response.msgArr?.join(' ') || 'Business listings are currently unavailable.');
          this.businesses.set([]); this.total.set(0); this.pages.set(1);
        } else {
          const data = response.data;
          this.businesses.set(data.items ?? []);
          this.total.set(data.pagination?.total ?? data.items?.length ?? 0);
          this.pages.set(Math.max(1, Math.ceil(this.total() / (data.pagination?.page_size || this.pageSize))));
        }
        this.loading.set(false);
      },
      error: () => { this.error.set('We could not load businesses. Please try again.'); this.loading.set(false); },
    });
  }
}
