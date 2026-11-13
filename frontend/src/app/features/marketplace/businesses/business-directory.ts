import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MarketplaceApiService, MarketplaceBusiness } from '../../../core/marketplace/marketplace-api.service';

@Component({
  selector: 'app-business-directory',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="intro">
        <p class="eyebrow">THE BBG COMMUNITY</p>
        <h1>Discover <span>businesses</span></h1>
        <p class="lead">Find businesses, explore what they offer and connect with the people behind them.</p>
        <form class="search" (ngSubmit)="search()">
          <label class="sr-only" for="business-search">Search businesses</label>
          <input id="business-search" name="query" [(ngModel)]="query" placeholder="Search by business name or keyword" />
          <button type="submit">Search businesses</button>
        </form>
      </section>
      <section class="results" aria-labelledby="results-title">
        <div class="heading"><div><p class="eyebrow">EXPLORE</p><h2 id="results-title">{{ heading() }}</h2></div><span>{{ total() }} results</span></div>
        @if (loading()) {
          <div class="state" role="status">Finding businesses…</div>
        } @else if (error()) {
          <div class="state error" role="alert">{{ error() }} <button type="button" (click)="search()">Try again</button></div>
        } @else if (businesses().length) {
          <div class="grid">
            @for (business of businesses(); track business.id) {
              <article class="card">
                <div class="card-top">
                  <div class="avatar">{{ business.business_name.slice(0, 1).toUpperCase() }}</div>
                  @if (business.category_name) { <span class="tag">{{ business.category_name }}</span> }
                </div>
                <h3>{{ business.business_name }}</h3>
                <p class="location">{{ location(business) }}</p>
                @if (business.business_description) { <p class="description">{{ business.business_description }}</p> }
                <div class="features">
                  @if (business.accept_online_orders) { <span>Online orders</span> }
                  @if (business.whatsapp_enabled) { <span>WhatsApp</span> }
                </div>
                <a class="card-action" [routerLink]="['/businesses', business.business_slug]">Explore business <span aria-hidden="true">→</span></a>
              </article>
            }
          </div>
          <div class="pagination">
            <button type="button" [disabled]="page() <= 1" (click)="changePage(page() - 1)">Previous</button>
            <span>Page {{ page() }} of {{ pages() }}</span>
            <button type="button" [disabled]="page() >= pages()" (click)="changePage(page() + 1)">Next</button>
          </div>
        } @else {
          <div class="empty"><div class="empty-mark">⌕</div><h3>No businesses found</h3><p>Try a different search, or come back as more businesses join BBG.</p><button type="button" (click)="clearSearch()">Clear search</button></div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:65vh;padding:0 0 64px;background:var(--surface-page)}
    .intro{padding:65px max(24px,calc((100vw - 1180px)/2)) 54px;color:#fff;background:linear-gradient(120deg,#123f2c,#1d6243)}
    .eyebrow{margin:0 0 12px;color:#789987;font-size:.68rem;font-weight:800;letter-spacing:.16em}.intro .eyebrow{color:#c5d9ce}
    h1{margin:0;font-size:clamp(2.5rem,6vw,4.4rem);letter-spacing:-.065em;line-height:1.05}h1 span{color:#f5d928}
    .lead{max-width:650px;margin:16px 0 24px;color:rgba(255,255,255,.82);line-height:1.65}
    .search{display:flex;max-width:680px;gap:9px;padding:6px;background:#fff;border-radius:12px}
    .search input{flex:1;min-width:0;padding:0 13px;color:#171d19;border:0;outline:0}.search button,.empty button,.state button{padding:12px 16px;color:#171d19;background:#f5d928;border:0;border-radius:8px;font-weight:750;cursor:pointer}
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
    @media(max-width:600px){.intro{padding:45px 20px}.search{flex-direction:column}.search input{min-height:43px}.heading{align-items:flex-start;flex-direction:column}}
  `],
})
export class BusinessDirectory implements OnInit {
  private readonly api = inject(MarketplaceApiService);
  protected query = '';
  protected readonly businesses = signal<MarketplaceBusiness[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 12;
  protected readonly pages = signal(1);
  protected readonly heading = signal('All businesses');

  ngOnInit(): void { this.load(); }

  protected search(): void { this.page.set(1); this.load(); }
  protected clearSearch(): void { this.query = ''; this.page.set(1); this.load(); }
  protected changePage(value: number): void { this.page.set(value); this.load(); }
  protected location(business: MarketplaceBusiness): string {
    return [business.city, business.state].filter(Boolean).join(', ') || 'Location not provided';
  }

  private load(): void {
    this.loading.set(true); this.error.set('');
    this.heading.set(this.query.trim() ? 'Search results' : 'All businesses');
    this.api.listBusinesses(this.query.trim(), this.page(), this.pageSize).subscribe({
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
