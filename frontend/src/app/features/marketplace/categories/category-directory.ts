import { Component, OnInit, inject, signal } from '@angular/core';
import { MarketplaceApiService, MarketplaceCategory } from '../../../core/marketplace/marketplace-api.service';

@Component({
  selector: 'app-category-directory',
  template: `
    <main class="page">
      <section class="intro"><p class="eyebrow">EXPLORE THE MARKETPLACE</p><h1>Browse <span>categories</span></h1><p class="lead">Discover different industries and find the businesses and products that match what you need.</p></section>
      <section class="content">
        <div class="heading"><div><p class="eyebrow">FIND YOUR INTEREST</p><h2>Marketplace categories</h2></div><span>{{ categories().length }} categories</span></div>
        @if (loading()) { <div class="state" role="status">Loading categories…</div> }
        @else if (error()) { <div class="state error" role="alert">{{ error() }}</div> }
        @else if (categories().length) {
          <div class="grid">
            @for (category of categories(); track category.id) {
              <article class="card"><span class="mark">{{ category.category_name.slice(0,1).toUpperCase() }}</span><h3>{{ category.category_name }}</h3><p>{{ category.description || 'Explore businesses and offerings in this category.' }}</p><span class="type">{{ category.category_type }}</span></article>
            }
          </div>
        } @else { <div class="empty"><h3>Categories are coming soon</h3><p>Published marketplace categories will appear here.</p></div> }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:65vh;padding-bottom:64px;background:var(--surface-page)}.intro{padding:65px max(24px,calc((100vw - 1180px)/2)) 54px;color:#fff;background:linear-gradient(120deg,#123f2c,#1d6243)}
    .eyebrow{margin:0 0 12px;color:#c5d9ce;font-size:.68rem;font-weight:800;letter-spacing:.16em}h1{margin:0;font-size:clamp(2.5rem,6vw,4.4rem);letter-spacing:-.065em}h1 span{color:#f5d928}.lead{max-width:650px;margin:16px 0 0;color:rgba(255,255,255,.82);line-height:1.65}
    .content{width:min(1180px,calc(100% - 40px));margin:38px auto 0}.heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px}.heading .eyebrow{margin-bottom:6px;color:#789987}.heading h2{margin:0;color:var(--text-primary);font-size:1.65rem;letter-spacing:-.04em}.heading>span{color:var(--text-secondary);font-size:.8rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:15px}.card{min-height:185px;padding:21px;background:var(--surface-card);border:1px solid var(--border);border-radius:15px;transition:transform .18s ease,border-color .18s ease}.card:hover{transform:translateY(-3px);border-color:#9bb9a5}
    .mark{display:grid;width:42px;height:42px;place-items:center;color:#174d35;background:#e8f1eb;border-radius:12px;font-weight:850}.card h3{margin:15px 0 7px;color:var(--text-primary);font-size:1rem}.card p{min-height:3em;margin:0;color:var(--text-secondary);font-size:.8rem;line-height:1.5}.type{display:inline-block;margin-top:14px;color:#648071;font-size:.68rem;font-weight:750;text-transform:capitalize}
    .state,.empty{padding:32px;text-align:center;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:14px}.error{color:#a33}.empty h3{margin:0 0 6px;color:var(--text-primary)}.empty p{margin:0;font-size:.85rem}
    @media(max-width:600px){.intro{padding:45px 20px}.heading{align-items:flex-start;flex-direction:column}}
  `],
})
export class CategoryDirectory implements OnInit {
  private readonly api = inject(MarketplaceApiService);
  protected readonly categories = signal<MarketplaceCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.getHomeSummary().subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.error.set(response.msgArr?.join(' ') || 'Categories are currently unavailable.');
        } else { this.categories.set(response.data.categories ?? []); }
        this.loading.set(false);
      },
      error: () => { this.error.set('We could not load categories. Please try again.'); this.loading.set(false); },
    });
  }
}
