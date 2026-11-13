import { Component, OnInit, inject, signal } from '@angular/core';
import { MarketplaceApiService, MarketplacePromotion } from '../../../core/marketplace/marketplace-api.service';

@Component({
  selector: 'app-promotion-feed',
  template: `
    <main class="page">
      <section class="intro"><p class="eyebrow">OFFERS FROM THE BBG COMMUNITY</p><h1>Discover <span>promotions</span></h1><p class="lead">Keep up with the latest public promotions shared by businesses on BBG.</p></section>
      <section class="content">
        <div class="heading"><div><p class="eyebrow">WHAT'S HAPPENING</p><h2>Latest promotions</h2></div><span>{{ promotions().length }} available</span></div>
        @if (loading()) { <div class="state" role="status">Loading promotions…</div> }
        @else if (error()) { <div class="state error" role="alert">{{ error() }}</div> }
        @else if (promotions().length) {
          <div class="grid">
            @for (promotion of promotions(); track promotion.id) {
              <article class="card"><div class="ribbon">BBG PROMOTION</div><p class="business">{{ promotion.business_name }}</p><h3>{{ promotion.post_title }}</h3><p class="description">{{ promotion.post_content }}</p><div class="dates"><time [attr.datetime]="promotion.published_on">Published {{ formatDate(promotion.published_on) }}</time>@if (promotion.valid_until) { <time [attr.datetime]="promotion.valid_until">Valid until {{ formatDate(promotion.valid_until) }}</time> }</div></article>
            }
          </div>
        } @else { <div class="empty"><div class="gift">✦</div><h3>No active promotions right now</h3><p>When businesses publish public promotions, they will show up here.</p></div> }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:65vh;padding-bottom:64px;background:var(--surface-page)}.intro{padding:65px max(24px,calc((100vw - 1180px)/2)) 54px;color:#fff;background:linear-gradient(120deg,#123f2c,#1d6243)}
    .eyebrow{margin:0 0 12px;color:#c5d9ce;font-size:.68rem;font-weight:800;letter-spacing:.16em}h1{margin:0;font-size:clamp(2.5rem,6vw,4.4rem);letter-spacing:-.065em}h1 span{color:#f5d928}.lead{max-width:650px;margin:16px 0 0;color:rgba(255,255,255,.82);line-height:1.65}
    .content{width:min(1180px,calc(100% - 40px));margin:38px auto 0}.heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px}.heading .eyebrow{margin-bottom:6px;color:#789987}.heading h2{margin:0;color:var(--text-primary);font-size:1.65rem;letter-spacing:-.04em}.heading>span{color:var(--text-secondary);font-size:.8rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.card{position:relative;overflow:hidden;padding:24px;background:var(--surface-card);border:1px solid var(--border);border-radius:15px}.card::before{position:absolute;top:0;right:0;left:0;height:4px;background:#f5d928;content:""}.ribbon{display:inline-block;padding:6px 9px;color:#174d35;background:#e8f1eb;border-radius:6px;font-size:.65rem;font-weight:850;letter-spacing:.08em}.business{margin:18px 0 6px;color:#648071;font-size:.76rem;font-weight:750}.card h3{margin:0;color:var(--text-primary);font-size:1.2rem;letter-spacing:-.025em}.description{min-height:4.5em;margin:12px 0 20px;color:var(--text-secondary);font-size:.85rem;line-height:1.6}.dates{display:flex;flex-direction:column;gap:5px;color:var(--text-muted);font-size:.7rem}
    .state,.empty{padding:36px;text-align:center;color:var(--text-secondary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:14px}.error{color:#a33}.empty .gift{color:#b59c0b;font-size:2rem}.empty h3{margin:8px 0;color:var(--text-primary)}.empty p{margin:0;font-size:.85rem}
    @media(max-width:600px){.intro{padding:45px 20px}.heading{align-items:flex-start;flex-direction:column}}
  `],
})
export class PromotionFeed implements OnInit {
  private readonly api = inject(MarketplaceApiService);
  protected readonly promotions = signal<MarketplacePromotion[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.getHomeSummary().subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.error.set(response.msgArr?.join(' ') || 'Promotions are currently unavailable.');
        } else { this.promotions.set(response.data.promotions ?? []); }
        this.loading.set(false);
      },
      error: () => { this.error.set('We could not load promotions. Please try again.'); this.loading.set(false); },
    });
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day:'numeric', month:'short', year:'numeric' }).format(date);
  }
}
