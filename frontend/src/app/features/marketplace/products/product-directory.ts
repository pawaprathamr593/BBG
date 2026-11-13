import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketplaceApiService, MarketplaceCategory, MarketplaceProduct } from '../../../core/marketplace/marketplace-api.service';

type ProductSort = 'newest' | 'popular' | 'nearby' | 'price_low' | 'price_high' | 'name';

@Component({
  selector: 'app-product-directory',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="intro">
        <p class="eyebrow">THE BBG MARKETPLACE</p>
        <h1>Discover <span>products</span></h1>
        <p class="lead">Explore products from approved BBG businesses. Search by name, compare prices and find sellers near you.</p>
        <div class="intro-meta"><span>One marketplace</span><i></i><span>Products from verified storefronts</span></div>
      </section>

      <section class="results" aria-labelledby="products-title">
        <div class="heading">
          <div><p class="eyebrow">PRODUCT DISCOVERY</p><h2 id="products-title">Explore all products</h2></div>
          <span>{{ total() }} products</span>
        </div>

        <form class="filters" (ngSubmit)="applyFilters()" aria-label="Filter products">
          <div class="filter-field search-field">
            <label for="product-search">Search products</label>
            <input id="product-search" name="search" [(ngModel)]="query" placeholder="Name, code, brand or keyword" />
          </div>
          <div class="filter-field">
            <label for="product-category">Category</label>
            <select id="product-category" name="category" [(ngModel)]="categoryId">
              <option value="">All product categories</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.category_name }}</option>
              }
            </select>
          </div>
          <div class="filter-field">
            <label for="product-sort">Sort by</label>
            <select id="product-sort" name="sort" [(ngModel)]="sort" (ngModelChange)="sortChanged($event)">
              <option value="newest">Newly added</option>
              <option value="popular">Most popular</option>
              <option value="nearby">Nearby first</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
          <div class="filter-field">
            <label for="product-brand">Brand</label>
            <input id="product-brand" name="brand" [(ngModel)]="brand" placeholder="Any brand" />
          </div>
          <div class="filter-field">
            <label for="product-city">City</label>
            <input id="product-city" name="city" [(ngModel)]="city" placeholder="Any city" />
          </div>
          <div class="filter-field">
            <label for="product-state">State</label>
            <input id="product-state" name="state" [(ngModel)]="state" placeholder="Any state" />
          </div>
          <div class="filter-field">
            <label for="product-min-price">Minimum price (₹)</label>
            <input id="product-min-price" name="minPrice" type="number" min="0" step="0.01" [(ngModel)]="minPrice" placeholder="No minimum" />
          </div>
          <div class="filter-field">
            <label for="product-max-price">Maximum price (₹)</label>
            <input id="product-max-price" name="maxPrice" type="number" min="0" step="0.01" [(ngModel)]="maxPrice" placeholder="No maximum" />
          </div>
          <label class="check-field"><input type="checkbox" name="onlineOnly" [(ngModel)]="onlineOnly" /><span>Businesses accepting online orders only</span></label>
          <div class="filter-actions">
            <button class="apply-filters" type="submit">Apply filters</button>
            <button class="clear-filters" type="button" (click)="clearFilters()">Clear all</button>
          </div>
        </form>

        @if (filterNotice()) { <p class="notice" role="status">{{ filterNotice() }}</p> }
        @if (loading()) {
          <div class="state" role="status">Finding products across BBG storefronts…</div>
        } @else if (error()) {
          <div class="state error" role="alert">{{ error() }} <button type="button" (click)="load()">Try again</button></div>
        } @else if (products().length) {
          <div class="grid">
            @for (product of products(); track product.id) {
              <article class="card">
                <div class="card-top">
                  <span class="product-mark" aria-hidden="true">BBG</span>
                  @if (product.category_name) { <span class="tag">{{ product.category_name }}</span> }
                </div>
                <h3>{{ product.product_name }}</h3>
                @if (product.brand_name) { <p class="brand">{{ product.brand_name }}</p> }
                @if (product.description) { <p class="description">{{ product.description }}</p> }
                @if (product.selling_price !== undefined) {
                  <p class="price">{{ formatPrice(product.selling_price) }} <span>/ {{ product.unit.symbol }}</span></p>
                } @else {
                  <p class="price-unavailable">Contact seller for pricing</p>
                }
                <div class="seller">
                  <span class="seller-name">{{ product.business.business_name }}</span>
                  <span>{{ product.business.city || 'Location not listed' }}{{ product.business.state ? ', ' + product.business.state : '' }}</span>
                </div>
                @if (sort === 'nearby' && product.distance_km !== undefined) {
                  <span class="distance">{{ product.distance_km }} km away</span>
                }
                @if (sort === 'popular' && product.popularity) {
                  <span class="popularity">{{ product.popularity.engagements }} views and likes</span>
                }
                <div class="card-actions">
                  <a class="primary-action" [routerLink]="['/products', product.id]">View product <span aria-hidden="true">→</span></a>
                  <a class="secondary-action" [routerLink]="['/businesses', product.business.business_slug]">Explore business</a>
                </div>
              </article>
            }
          </div>
          <div class="pagination">
            <button type="button" [disabled]="page() <= 1" (click)="changePage(page() - 1)">Previous</button>
            <span>Page {{ page() }} of {{ pages() }}</span>
            <button type="button" [disabled]="page() >= pages()" (click)="changePage(page() + 1)">Next</button>
          </div>
          <p class="data-note">Only active products published by approved businesses with active storefronts are displayed. “Newly added” uses the product record creation date.</p>
        } @else {
          <div class="empty"><div class="empty-mark">⌕</div><h3>No products found</h3><p>Try changing your search or removing some filters.</p><button type="button" (click)="clearFilters()">Clear all filters</button></div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:65vh;padding:0 0 64px;background:var(--surface-page)}
    .intro{position:relative;isolation:isolate;overflow:hidden;padding:76px max(24px,calc((100vw - 1180px)/2)) 64px;color:#fff;background:radial-gradient(ellipse at 88% 12%,rgba(245,217,40,.22),transparent 27%),radial-gradient(ellipse at 8% 100%,rgba(107,174,126,.28),transparent 38%),linear-gradient(120deg,#0d3425,#174d35 58%,#246747);border-radius:0 0 26px 26px;box-shadow:0 18px 48px rgba(17,64,43,.12)}
    .intro:before{position:absolute;z-index:-1;top:-150px;right:7%;width:360px;height:360px;border:1px solid rgba(255,255,255,.17);border-radius:50%;box-shadow:0 0 0 34px rgba(255,255,255,.035),0 0 0 72px rgba(255,255,255,.025);content:""}.intro:after{position:absolute;z-index:-1;right:19%;bottom:-105px;width:190px;height:190px;background:rgba(245,217,40,.13);border-radius:50%;filter:blur(2px);content:""}.intro>*{position:relative;z-index:1}
    .eyebrow{margin:0 0 12px;color:#789987;font-size:.68rem;font-weight:800;letter-spacing:.16em}.intro .eyebrow{color:#c5d9ce}
    h1{max-width:850px;margin:0;font-size:clamp(2.8rem,6.5vw,5rem);font-weight:820;letter-spacing:-.075em;line-height:.99;text-wrap:balance}h1 span{color:#f5d928}
    .lead{max-width:680px;margin:20px 0 20px;color:rgba(255,255,255,.86);font-size:1.02rem;line-height:1.7}.intro-meta{display:flex;align-items:center;gap:12px;color:#d5e5db;font-size:.76rem}.intro-meta i{width:4px;height:4px;background:#f5d928;border-radius:50%}
    .results{width:min(1180px,calc(100% - 40px));margin:38px auto 0}.heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px}.heading .eyebrow{margin-bottom:6px}.heading h2{margin:0;color:var(--text-primary);font-size:1.65rem;letter-spacing:-.04em}.heading>span{color:var(--text-secondary);font-size:.8rem}
    .filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:end;gap:12px;margin:0 0 22px;padding:18px;background:var(--surface-card);border:1px solid var(--border);border-radius:15px;box-shadow:0 8px 24px rgba(20,35,27,.045)}
    .filter-field{display:grid;gap:7px;min-width:0}.filter-field label{color:var(--text-secondary);font-size:.72rem;font-weight:750}.filter-field input,.filter-field select{width:100%;min-width:0;height:42px;padding:0 11px;color:var(--text-primary);background:var(--surface-page);border:1px solid var(--border);border-radius:8px;font:inherit;font-size:.82rem;outline:none}.filter-field input:focus,.filter-field select:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
    .check-field{display:flex;align-items:center;gap:9px;min-height:42px;color:var(--text-secondary);font-size:.76rem;font-weight:650}.check-field input{width:16px;height:16px;accent-color:#174d35}
    .filter-actions{display:flex;gap:7px}.filter-actions button{height:42px;padding:0 15px;border-radius:8px;font-size:.76rem;font-weight:750;white-space:nowrap;cursor:pointer}.apply-filters{color:#17231b;background:#f5d928;border:1px solid #f5d928}.clear-filters{color:var(--text-secondary);background:transparent;border:1px solid var(--border)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:16px}.card{display:flex;min-width:0;flex-direction:column;padding:20px;background:var(--surface-card);border:1px solid var(--border);border-radius:15px;transition:transform .18s ease,border-color .18s ease}.card:hover{transform:translateY(-3px);border-color:#9bb9a5}
    .card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px}.product-mark{display:grid;width:44px;height:44px;place-items:center;color:#174d35;background:#e8f1eb;border-radius:13px;font-size:.7rem;font-weight:900;letter-spacing:.04em}.tag{padding:6px 9px;color:#315d47;background:#eaf2ec;border-radius:999px;font-size:.68rem;font-weight:700}
    .card h3{margin:0 0 5px;color:var(--text-primary);font-size:1rem;line-height:1.35}.brand{margin:0;color:#648071;font-size:.76rem;font-weight:700}.description{display:-webkit-box;min-height:3.7em;margin:12px 0;overflow:hidden;color:var(--text-secondary);font-size:.8rem;line-height:1.55;-webkit-line-clamp:3;-webkit-box-orient:vertical}
    .price{margin:4px 0 13px;color:var(--text-primary);font-size:1.12rem;font-weight:850}.price span{color:var(--text-secondary);font-size:.72rem;font-weight:550}.price-unavailable{margin:4px 0 13px;color:var(--text-secondary);font-size:.8rem}
    .seller{display:grid;gap:3px;margin-top:auto;padding-top:12px;color:var(--text-secondary);font-size:.72rem;border-top:1px solid var(--border)}.seller-name{color:var(--text-primary);font-size:.78rem;font-weight:750}.distance,.popularity{margin-top:9px;color:#54765f;font-size:.7rem;font-weight:700}
    .card-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.card-actions a{display:flex;align-items:center;justify-content:center;gap:5px;min-height:38px;padding:8px 9px;border-radius:8px;font-size:.72rem;font-weight:750;text-align:center;text-decoration:none}.primary-action{color:#17231b;background:#f5d928;border:1px solid #f5d928}.secondary-action{color:#315d47;background:#edf4ef;border:1px solid #d8e7dc}
    .state,.empty{padding:30px;text-align:center;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:14px}.state button,.empty button{margin-left:8px;padding:9px 13px;color:#17231b;background:#f5d928;border:0;border-radius:8px;font-weight:750;cursor:pointer}.error{color:#a33}.empty{padding:44px 20px}.empty-mark{font-size:2.5rem;color:var(--brand)}.empty h3{margin:8px 0;color:var(--text-primary)}.empty p{margin:0 0 18px;font-size:.85rem}
    .pagination{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:24px;color:var(--text-secondary);font-size:.8rem}.pagination button{padding:9px 14px;color:var(--brand);background:var(--surface-card);border:1px solid var(--border);border-radius:8px;cursor:pointer}.pagination button:disabled{opacity:.4;cursor:not-allowed}
    .notice{margin:0 0 16px;padding:10px 13px;color:#765b12;background:#fff8dc;border:1px solid #f0e2a9;border-radius:8px;font-size:.78rem}.data-note{margin:18px 0 0;color:var(--text-secondary);font-size:.72rem;line-height:1.5}
    @media(max-width:900px){.filters{grid-template-columns:repeat(2,minmax(0,1fr))}.check-field,.filter-actions{grid-column:span 2}}
    @media(max-width:600px){.intro{padding:45px 20px}.heading{align-items:flex-start;flex-direction:column}.filters{grid-template-columns:1fr;padding:14px}.check-field,.filter-actions{grid-column:auto}.filter-actions button{flex:1}.card-actions{grid-template-columns:1fr}}
  `],
})
export class ProductDirectory implements OnInit {
  private readonly api = inject(MarketplaceApiService);
  private readonly route = inject(ActivatedRoute);

  protected query = '';
  protected categoryId = '';
  protected brand = '';
  protected city = '';
  protected state = '';
  protected minPrice: number | null = null;
  protected maxPrice: number | null = null;
  protected onlineOnly = false;
  protected sort: ProductSort = 'newest';
  protected readonly categories = signal<MarketplaceCategory[]>([]);
  protected readonly products = signal<MarketplaceProduct[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly filterNotice = signal('');
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 16;
  protected readonly pages = signal(1);
  private latitude: number | undefined;
  private longitude: number | undefined;

  ngOnInit(): void {
    const category = this.route.snapshot.queryParamMap.get('category_id');
    if (category && /^\\d+$/.test(category)) this.categoryId = category;
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

  protected applyFilters(): void {
    this.page.set(1);
    if (this.sort === 'nearby' && (this.latitude === undefined || this.longitude === undefined)) {
      this.requestLocation();
      return;
    }
    this.load();
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

  protected clearFilters(): void {
    this.query = '';
    this.categoryId = '';
    this.brand = '';
    this.city = '';
    this.state = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.onlineOnly = false;
    this.sort = 'newest';
    this.latitude = undefined;
    this.longitude = undefined;
    this.filterNotice.set('');
    this.page.set(1);
    this.load();
  }

  protected changePage(value: number): void {
    this.page.set(value);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    const filters = {
      search: this.query.trim(),
      ...(this.categoryId ? { category_id: Number(this.categoryId) } : {}),
      brand: this.brand.trim(),
      city: this.city.trim(),
      state: this.state.trim(),
      ...(this.minPrice !== null && this.minPrice !== undefined ? { min_price: this.minPrice } : {}),
      ...(this.maxPrice !== null && this.maxPrice !== undefined ? { max_price: this.maxPrice } : {}),
      online_only: this.onlineOnly,
      sort: this.sort,
      ...(this.sort === 'nearby' && this.latitude !== undefined && this.longitude !== undefined
        ? { latitude: this.latitude, longitude: this.longitude }
        : {}),
    };
    this.api.listProducts(filters, this.page(), this.pageSize).subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.error.set(response.msgArr?.join(' ') || 'Product listings are currently unavailable.');
          this.products.set([]);
          this.total.set(0);
          this.pages.set(1);
        } else {
          const data = response.data;
          this.products.set(data.items ?? []);
          this.total.set(data.pagination?.total ?? data.items?.length ?? 0);
          this.pages.set(Math.max(1, Math.ceil(this.total() / (data.pagination?.page_size || this.pageSize))));
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('We could not load products. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected formatPrice(value: number | string): string {
    const amount = Number(value);
    return Number.isFinite(amount) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount) : 'Price unavailable';
  }

  private requestLocation(): void {
    if (!navigator.geolocation) {
      this.sort = 'newest';
      this.filterNotice.set('Your browser does not support location access. Showing newly added products instead.');
      this.load();
      return;
    }
    this.loading.set(true);
    this.filterNotice.set('Allow location access to sort products by distance.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.filterNotice.set('Showing products nearest to your current location. Location is used only for this search.');
        this.load();
      },
      () => {
        this.sort = 'newest';
        this.latitude = undefined;
        this.longitude = undefined;
        this.filterNotice.set('Location access was unavailable. Showing newly added products; you can still filter by city or state.');
        this.load();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }
}
