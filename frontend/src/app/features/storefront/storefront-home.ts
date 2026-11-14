import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MarketplaceApiService, MarketplaceBusinessDetail, MarketplaceProduct, MarketplacePromotion } from '../../core/marketplace/marketplace-api.service';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

@Component({
  selector: 'app-storefront-home',
  imports: [RouterLink],
  template: `
    @if (context.detail(); as data) {
      <main class="home-page">
        <section class="page-hero home-hero" aria-labelledby="storefront-title">
          @if (data.business.cover_image_path) {
            <img class="home-cover" [src]="data.business.cover_image_path" [alt]="brandName + ' storefront cover'" fetchpriority="high" />
          }
          <div class="home-shade" aria-hidden="true"></div>
          <div class="hero-inner">
            <p class="eyebrow"><span>OFFICIAL STOREFRONT</span><i></i> {{ data.business.category_name || 'OUR BUSINESS' }}</p>
            <div class="store-identity">
              @if (data.business.logo_path) {
                <img class="store-logo" [src]="data.business.logo_path" [alt]="brandName + ' logo'" />
              }
              <div class="identity-copy">
                <span class="identity-caption">WELCOME TO</span>
                <h1 id="storefront-title">{{ brandName }}<b>.</b></h1>
              </div>
            </div>
            <p class="hero-description">{{ data.storefront.description || data.business.business_description || 'Explore this business storefront and get in touch for products, services and more information.' }}</p>
            <div class="hero-actions">
              <a class="primary-button" [routerLink]="['/store', data.business.business_slug, 'products']">Explore catalogue <span aria-hidden="true">↗</span></a>
              <a class="secondary-button" [routerLink]="['/store', data.business.business_slug, 'contact']">Contact the store</a>
              <button class="share-button" type="button" (click)="shareStore()" aria-label="Share this store">↗ <span>Share store</span></button>
            </div>
            @if (shareFeedback()) { <p class="share-feedback" role="status">{{ shareFeedback() }}</p> }
          </div>
        </section>

        <section class="store-meta-band" aria-label="Storefront information">
            <div class="hero-meta">
              <span><i aria-hidden="true">✓</i> Official BBG storefront</span>
              @if (data.storefront.accept_online_orders) { <span><i aria-hidden="true">✓</i> Online orders available</span> }
              @if (data.business.city || data.business.state) {
                <span><i aria-hidden="true">⌖</i> {{ data.business.city }}{{ data.business.city && data.business.state ? ', ' : '' }}{{ data.business.state }}</span>
              }
            </div>
        </section>

        @if (data.business.business_phone || (data.storefront.whatsapp_enabled && data.business.whatsapp_number) || hasDirections(data) || data.business.business_email) {
        <section class="quick-actions" aria-label="Quick store actions">
          @if (data.business.business_phone) {
            <a [href]="'tel:' + data.business.business_phone"><span class="quick-icon" aria-hidden="true">☎</span><span><strong>Call store</strong><small>{{ data.business.business_phone }}</small></span></a>
          }
          @if (data.storefront.whatsapp_enabled && data.business.whatsapp_number) {
            <a [href]="whatsappUrl(data.business.whatsapp_number)" target="_blank" rel="noopener noreferrer"><span class="quick-icon" aria-hidden="true">◉</span><span><strong>WhatsApp</strong><small>Chat with the business</small></span></a>
          }
          @if (hasDirections(data)) {
            <a [href]="directionsUrl(data)" target="_blank" rel="noopener noreferrer"><span class="quick-icon" aria-hidden="true">⌖</span><span><strong>Directions</strong><small>{{ data.business.city || data.business.state || 'Find the store' }}</small></span></a>
          }
          @if (data.business.business_email) {
            <a [href]="'mailto:' + data.business.business_email"><span class="quick-icon" aria-hidden="true">✉</span><span><strong>Email store</strong><small>{{ data.business.business_email }}</small></span></a>
          }
        </section>
        }

        @if (promotions().length) {
          <section class="promotion-ticker" aria-label="Current store promotions">
            <span class="promo-label">STORE OFFER</span>
            <div class="promo-copy">
              <strong>{{ promotions()[0].post_title }}</strong>
              <span>{{ promotions()[0].post_content }}</span>
            </div>
            @if (promotions()[0].valid_until) { <time [attr.datetime]="promotions()[0].valid_until">Until {{ formatDate(promotions()[0].valid_until!) }}</time> }
          </section>
        }

        <section class="shopping-benefits" aria-label="Store information">
          <div><span class="benefit-icon" aria-hidden="true">◇</span><span><strong>Shop directly</strong><small>Explore products from {{ brandName }}</small></span></div>
          <div><span class="benefit-icon" aria-hidden="true">↗</span><span><strong>Talk to the business</strong><small>Get product and pricing information</small></span></div>
          @if (data.storefront.accept_online_orders) {
            <div><span class="benefit-icon" aria-hidden="true">✓</span><span><strong>Online ordering</strong><small>This storefront accepts online orders</small></span></div>
          } @else {
            <div><span class="benefit-icon" aria-hidden="true">⌖</span><span><strong>Find the business</strong><small>{{ data.business.city || data.business.state || 'Contact details available' }}</small></span></div>
          }
        </section>

        <section id="featured-products" class="products-section" aria-labelledby="products-heading">
          <div class="section-heading">
            <div>
              <p class="eyebrow">THE COLLECTION</p>
              <h2 id="products-heading">Explore our catalogue</h2>
              <p>Explore the products and offerings currently published by {{ brandName }}.</p>
            </div>
            <a class="view-all" [routerLink]="['/store', data.business.business_slug, 'products']">View full catalogue <span aria-hidden="true">→</span></a>
          </div>

          @if (categories().length > 1) {
            <nav class="category-pills" aria-label="Filter catalogue by category">
              <button type="button" [class.active]="selectedCategory() === 'all'" (click)="selectCategory('all')">All</button>
              @for (category of categories(); track category) {
                <button type="button" [class.active]="selectedCategory() === category" (click)="selectCategory(category)">{{ category }}</button>
              }
            </nav>
          }

          @if (loading()) {
            <div class="product-grid" aria-label="Loading products">
              @for (item of skeletons; track item) { <div class="product-skeleton"><span></span><i></i><i></i><b></b></div> }
            </div>
          } @else if (products().length) {
            @if (filteredProducts().length) {
              <div class="product-grid">
                @for (product of filteredProducts(); track product.id; let index = $index) {
                  <a class="product-card" [routerLink]="product.offering_type === 'SERVICE' ? ['/store', data.business.business_slug, 'contact'] : ['/store', data.business.business_slug, 'products', productRoute(product)]" [queryParams]="product.offering_type === 'SERVICE' ? { subject: 'Service enquiry: ' + product.product_name } : null">
                  <div class="product-image" [class.image-alt]="index % 2 === 1">
                    <span class="category-tag">{{ product.offering_type === 'SERVICE' ? 'SERVICE' : (product.category_name || 'PRODUCT') }}</span>
                    <span class="product-initial">{{ product.product_name.slice(0, 1).toUpperCase() }}</span>
                  </div>
                  <div class="product-details">
                    @if (product.brand_name && product.offering_type !== 'SERVICE') { <span class="product-brand">{{ product.brand_name }}</span> }
                    <h3>{{ product.product_name }}</h3>
                    <p>{{ product.description || (product.offering_type === 'SERVICE' ? 'Contact the business for service details and availability.' : 'View product details and contact the business for more information.') }}</p>
                    <div class="product-purchase">
                      @if (product.offering_type === 'SERVICE') {
                        <strong class="enquire-price">Request details</strong>
                        <span>Contact store <b aria-hidden="true">→</b></span>
                      } @else {
                        @if (data.storefront.show_prices && product.selling_price !== undefined) {
                          <strong>{{ data.storefront.currency || '' }} {{ product.selling_price }}</strong>
                        } @else { <strong class="enquire-price">Enquire for price</strong> }
                        <span>View details <b aria-hidden="true">→</b></span>
                      }
                    </div>
                  </div>
                </a>
                }
              </div>
            } @else {
              <div class="empty-products"><span aria-hidden="true">⌕</span><div><h3>No offerings in this category</h3><p>Choose another category to explore the catalogue.</p></div><button type="button" class="empty-filter-action" (click)="selectCategory('all')">Show all</button></div>
            }
          } @else {
            <div class="empty-products">
              <span aria-hidden="true">⌕</span>
              <div><h3>Catalogue coming soon</h3><p>{{ brandName }} has not published any products or service offerings to this storefront yet. Please check back later or contact the business.</p></div>
              <a [routerLink]="['/store', data.business.business_slug, 'contact']">Contact the business →</a>
            </div>
          }
        </section>

        @if (data.storefront.description || data.business.business_description) {
          <section class="merchant-story">
            <div class="story-copy">
              <p class="eyebrow">THE PEOPLE BEHIND THE STORE</p>
              <h2>A little about {{ brandName }}</h2>
              <p>{{ data.storefront.description || data.business.business_description }}</p>
              <a [routerLink]="['/store', data.business.business_slug, 'about']">Get to know the business <span aria-hidden="true">↗</span></a>
            </div>
          </section>
        }

        <section class="store-contact">
          <div>
            <p class="eyebrow">NEED A HAND?</p>
            <h2>Looking for something in particular?</h2>
            <p>Get in touch with {{ brandName }} for product details, availability or pricing.</p>
          </div>
          <a [routerLink]="['/store', data.business.business_slug, 'contact']">Contact the store <span aria-hidden="true">↗</span></a>
        </section>
      </main>
    }
  `,
  styles: [`
    :host{display:block;color:var(--text-primary);background:var(--surface-page)}
    .home-page{overflow:hidden;background:var(--surface-page)}
    .page-hero{position:relative;isolation:isolate;display:flex;min-height:400px;align-items:center;overflow:hidden;background:radial-gradient(ellipse at 83% 20%,#397653 0%,transparent 36%),linear-gradient(115deg,#123e2b,#0e2b1e);color:#fff}
    .home-cover,.home-shade{position:absolute;z-index:-1;inset:0;width:100%;height:100%}
    .home-cover{object-fit:cover;opacity:.36}
    .home-shade{background:linear-gradient(90deg,#0d2e20f5 0%,#123e2bd9 55%,#123e2b72 100%)}
    .hero-inner{width:min(100% - 64px,1160px);margin:0 auto;padding:66px 0}
    .eyebrow{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:0 0 22px;color:#d5e5da;font-size:.66rem;font-weight:800;letter-spacing:.16em}
    .eyebrow i{width:25px;height:1px;background:var(--accent)}
    .store-identity{display:flex;align-items:center;gap:19px}
    .store-logo,.store-logo-fallback{width:82px;height:82px;flex:0 0 82px;border:2px solid #ffffffa6;border-radius:50%;background:#ffffff18;object-fit:cover;box-shadow:0 8px 28px #061c1240}
    .store-logo-fallback{display:grid;place-items:center;color:#fff;font-size:2rem;font-weight:650}
    .identity-copy{min-width:0}
    .identity-caption{display:block;margin-bottom:5px;color:#d5e5da;font-size:.62rem;font-weight:750;letter-spacing:.18em}
    .hero-inner h1{max-width:900px;margin:0;color:#fff;font-size:clamp(3.2rem,7vw,5.7rem);font-weight:760;letter-spacing:-.075em;line-height:1.02;overflow-wrap:anywhere}
    .hero-inner h1>b{color:var(--accent)}
    .hero-description{max-width:670px;margin:20px 0 0;color:#dce8df;font-size:1rem;line-height:1.8}
    .hero-actions{display:flex;flex-wrap:wrap;gap:11px;margin-top:27px}
    .primary-button,.secondary-button{display:inline-flex;min-height:47px;align-items:center;justify-content:center;gap:20px;padding:0 17px;border-radius:5px;font-size:.78rem;font-weight:750;text-decoration:none;transition:background .18s ease,border-color .18s ease,transform .18s ease}
    .primary-button{border:1px solid var(--brand);background:var(--brand);color:#fff}
    :host-context(html[data-theme="dark"]) .primary-button{color:#17251c}
    .secondary-button{border:1px solid #ffffff70;background:#ffffff12;color:#fff}
    .primary-button:hover,.secondary-button:hover{transform:translateY(-2px)}
    .secondary-button:hover{background:#ffffff24;border-color:#fff}
    .store-meta-band{width:100%;padding:17px max(32px,calc((100vw - 1160px)/2));border-bottom:1px solid var(--border);background:var(--surface-card)}
    .hero-meta{display:flex;max-width:1160px;flex-wrap:wrap;gap:10px 28px;margin:0 auto;color:var(--text-secondary);font-size:.72rem}
    .hero-meta span{display:inline-flex;align-items:center;gap:7px}
    .hero-meta i{color:var(--brand-strong);font-style:normal;font-weight:850}
    .share-button{display:inline-flex;min-height:43px;align-items:center;gap:9px;padding:0 13px;border:1px solid #ffffff70;border-radius:5px;background:#ffffff12;color:#fff;font-size:.72rem;font-weight:700;cursor:pointer}
    .share-feedback{margin:10px 0 0;color:#e2eee5;font-size:.72rem}
    .quick-actions{display:flex;width:min(100% - 64px,1160px);flex-wrap:wrap;gap:10px;margin:18px auto 0}
    .quick-actions>a{display:flex;min-width:190px;flex:1;align-items:center;gap:11px;padding:13px 15px;border:1px solid var(--border);border-radius:8px;background:var(--surface-card);color:var(--text-primary);text-decoration:none}
    .quick-icon{display:grid;width:35px;height:35px;flex:0 0 35px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-strong)}
    .quick-actions strong,.quick-actions small{display:block}.quick-actions strong{font-size:.74rem;font-weight:650}.quick-actions small{margin-top:3px;color:var(--text-secondary);font-size:.65rem}
    .promotion-ticker{display:flex;width:min(100% - 64px,1160px);align-items:center;gap:15px;margin:17px auto 0;padding:13px 16px;border:1px solid color-mix(in srgb,var(--brand) 22%,var(--border));border-radius:7px;background:var(--brand-soft)}
    .promo-label{flex:0 0 auto;color:var(--brand-strong);font-size:.61rem;font-weight:850;letter-spacing:.12em}
    .promo-copy{display:flex;min-width:0;flex:1;flex-wrap:wrap;align-items:baseline;gap:5px 12px}.promo-copy strong{font-size:.78rem}.promo-copy span{color:var(--text-secondary);font-size:.72rem}
    .promotion-ticker time{flex:0 0 auto;color:var(--text-muted);font-size:.64rem}
    .shopping-benefits{display:grid;width:min(100% - 64px,1160px);grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin:0 auto;padding:25px 0;border-bottom:1px solid var(--border)}
    .shopping-benefits>div{display:flex;align-items:center;gap:12px;padding:4px 12px}
    .benefit-icon{display:grid;width:38px;height:38px;flex:0 0 38px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-strong);font-size:1rem}
    .shopping-benefits>div>span:last-child{display:flex;flex-direction:column;gap:4px}
    .shopping-benefits strong{font-size:.75rem;font-weight:620}
    .shopping-benefits small{color:var(--text-secondary);font-size:.66rem;line-height:1.4}
    .products-section{width:min(100% - 64px,1160px);margin:0 auto;padding:66px 0 78px}
    .section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:24px}
    .section-heading .eyebrow{margin-bottom:7px}
    .section-heading h2{margin:0;color:var(--text-primary);font-size:clamp(1.65rem,3vw,2.35rem);font-weight:590;letter-spacing:-.05em}
    .section-heading>div>p:last-child{margin:8px 0 0;color:var(--text-secondary);font-size:.82rem}
    .view-all{display:inline-flex;align-items:center;gap:12px;color:var(--brand-strong);font-size:.75rem;font-weight:650;text-decoration:none;white-space:nowrap}
    .category-pills{display:flex;gap:8px;overflow-x:auto;margin:-4px 0 20px;padding:3px 0 8px;scrollbar-width:thin}
    .category-pills button{flex:0 0 auto;padding:8px 14px;border:1px solid var(--border);border-radius:999px;background:var(--surface-card);color:var(--text-secondary);font-size:.7rem;font-weight:650;cursor:pointer}
    .category-pills button.active{border-color:var(--brand);background:var(--brand-soft);color:var(--brand-strong)}
    .product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:17px}
    .product-card{min-width:0;overflow:hidden;border:1px solid var(--border);border-radius:9px;background:var(--surface-card);color:var(--text-primary);text-decoration:none;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
    .product-card:hover{transform:translateY(-3px);border-color:var(--brand);box-shadow:0 12px 28px #1d392510}
    .product-image{position:relative;display:grid;aspect-ratio:1/1;min-height:0;place-items:center;overflow:hidden;background:linear-gradient(145deg,#edf3ee,#dbe8de);color:#315d47}
    .product-image.image-alt{background:linear-gradient(145deg,#f6f2dc,#e9e3bd);color:#665c26}
    .category-tag{position:absolute;top:12px;left:12px;max-width:80%;overflow:hidden;padding:6px 8px;border:1px solid currentColor;border-radius:3px;background:#ffffffb8;color:inherit;font-size:.55rem;font-weight:650;letter-spacing:.08em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
    .product-initial{font-size:5.8rem;font-weight:500;letter-spacing:-.09em;opacity:.8}
    .product-details{padding:15px}
    .product-brand{display:block;margin-bottom:5px;color:var(--text-muted);font-size:.66rem}
    .product-details h3{overflow:hidden;margin:0;color:var(--text-primary);font-size:.9rem;font-weight:620;letter-spacing:-.02em;text-overflow:ellipsis}
    .product-details>p{display:-webkit-box;min-height:40px;overflow:hidden;margin:9px 0 13px;color:var(--text-secondary);font-size:.71rem;line-height:1.6;-webkit-box-orient:vertical;-webkit-line-clamp:2}
    .product-purchase{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:11px;border-top:1px solid var(--border)}
    .product-purchase>strong{color:var(--brand-strong);font-size:.82rem;font-weight:650}
    .product-purchase .enquire-price{font-size:.72rem}
    .product-purchase>span{color:var(--text-secondary);font-size:.66rem}
    .product-purchase b{color:var(--brand-strong)}
    .empty-products{display:flex;align-items:center;gap:18px;padding:26px;border:1px dashed var(--border);border-radius:9px;background:var(--surface-card)}
    .empty-products>span{display:grid;width:46px;height:46px;flex:0 0 46px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-strong);font-size:1.4rem}
    .empty-products h3{margin:0 0 5px;font-size:.95rem;font-weight:600}
    .empty-products p{margin:0;color:var(--text-secondary);font-size:.76rem;line-height:1.6}
    .empty-products>a{margin-left:auto;color:var(--brand-strong);font-size:.72rem;font-weight:650;text-decoration:none;white-space:nowrap}
    .empty-filter-action{margin-left:auto;border:0;background:none;color:var(--brand-strong);font-size:.72rem;font-weight:700;cursor:pointer}
    .merchant-story{display:flex;width:min(100% - 64px,1160px);align-items:flex-start;gap:20px;margin:0 auto 65px;padding:28px;border:1px solid var(--border);border-radius:9px;background:var(--surface-card)}
    
    .story-copy{max-width:800px}.story-copy .eyebrow{margin-bottom:8px;color:var(--brand-strong)}
    .story-copy h2{margin:0;font-size:1.35rem;font-weight:620;letter-spacing:-.04em}
    .story-copy>p:not(.eyebrow){margin:10px 0 14px;color:var(--text-secondary);font-size:.8rem;line-height:1.8;white-space:pre-line}
    .story-copy a{color:var(--brand-strong);font-size:.72rem;font-weight:700;text-decoration:none}
    .product-skeleton{display:flex;flex-direction:column;gap:11px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--surface-card)}
    .product-skeleton span{aspect-ratio:1/1;border-radius:5px;background:var(--surface-subtle)}
    .product-skeleton i{height:9px;border-radius:5px;background:var(--surface-subtle)}
    .product-skeleton i:nth-of-type(2){width:65%}
    .product-skeleton b{width:40%;height:13px;margin-top:5px;border-radius:5px;background:var(--surface-subtle)}
    .store-contact{display:flex;align-items:center;justify-content:space-between;gap:25px;padding:38px max(32px,calc((100vw - 1160px)/2));background:var(--brand-soft)}
    .store-contact .eyebrow{margin-bottom:8px}
    .store-contact h2{margin:0 0 7px;font-size:clamp(1.35rem,2.7vw,1.9rem);font-weight:590;letter-spacing:-.04em}
    .store-contact p:last-child{margin:0;color:var(--text-secondary);font-size:.78rem;line-height:1.6}
    .store-contact>a{display:inline-flex;min-height:43px;align-items:center;justify-content:space-between;gap:20px;padding:0 14px;border:1px solid var(--border);border-radius:5px;background:var(--surface-card);color:var(--text-primary);font-size:.72rem;font-weight:650;text-decoration:none;white-space:nowrap}
    @media(max-width:1000px){.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-inner{grid-template-columns:minmax(0,1fr) minmax(260px,.8fr);gap:28px}}
    @media(max-width:650px){.hero-inner,.shopping-benefits,.products-section,.quick-actions,.promotion-ticker,.merchant-story{width:calc(100% - 40px)}.hero-inner{padding:52px 0}.store-meta-band{padding:15px 20px}.hero-meta{gap:9px 16px}.store-identity{align-items:flex-start;gap:13px}.store-logo{width:62px;height:62px;flex-basis:62px}.identity-caption{font-size:.55rem}.hero-inner h1{font-size:clamp(2.65rem,11vw,4rem)}.hero-description{font-size:.88rem}.hero-meta{gap:9px 13px}.quick-actions>a{min-width:100%}.promotion-ticker{align-items:flex-start;flex-direction:column;gap:7px}.merchant-story{padding:20px}.shopping-benefits{grid-template-columns:1fr;gap:9px;padding:18px 0}.shopping-benefits>div{padding:3px 0}.products-section{padding:46px 0 55px}.section-heading{align-items:flex-start;flex-direction:column;gap:13px}.product-grid{gap:11px}.product-image{min-height:150px}.product-initial{font-size:4.5rem}.product-details{padding:12px}.product-details h3{font-size:.82rem}.product-details>p{font-size:.68rem}.product-purchase>span{font-size:.6rem}.store-contact{align-items:flex-start;flex-direction:column;padding:30px 18px}.store-contact>a{width:100%}.empty-products{align-items:flex-start;flex-direction:column;padding:20px}.empty-products>a{margin-left:0}}
    @media(max-width:390px){.product-grid{grid-template-columns:1fr}.product-image{min-height:205px}.product-initial{font-size:5.5rem}}
    @media(prefers-reduced-motion:reduce){.primary-button,.secondary-button,.product-card{transition:none}.primary-button:hover,.secondary-button:hover,.product-card:hover{transform:none}}
  `],
})
export class StorefrontHome {
  readonly context = inject(StorefrontContextService);
  private readonly api = inject(MarketplaceApiService);
  private readonly seo = inject(StorefrontSeoService);
  readonly products = signal<MarketplaceProduct[]>([]);
  readonly promotions = signal<MarketplacePromotion[]>([]);
  readonly loading = signal(true);
  readonly selectedCategory = signal('all');
  readonly shareFeedback = signal('');
  readonly categories = computed(() => [...new Set(this.products().map(item => item.category_name).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b)));
  readonly filteredProducts = computed(() => (this.selectedCategory() === 'all' ? this.products() : this.products().filter(item => item.category_name === this.selectedCategory())).slice(0, 8));
  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  get brandName(): string {
    const detail = this.context.detail();
    return detail?.storefront.title || detail?.business.business_name || 'Storefront';
  }

  private initializedSlug = '';

  constructor() {
    effect(() => {
      const detail = this.context.detail();
      if (!detail) return;
      const slug = detail.business.business_slug;
      if (!slug || this.initializedSlug === slug) return;
      this.initializedSlug = slug;
      void this.initializeStorefront();
    });
  }

  private async initializeStorefront(): Promise<void> {
    const detail = this.context.detail();
    const slug = detail?.business.business_slug;
    if (!detail || !slug) {
      this.loading.set(false);
      return;
    }

    const name = detail.storefront.title || detail.business.business_name;
    const description = detail.storefront.description || detail.business.business_description || 'Browse products and contact ' + name + ' through its official BBG storefront.';
    const path = '/store/' + encodeURIComponent(slug);
    this.seo.update(name + ' | Official Storefront', description, path, {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: name + ' | Official Storefront',
      description,
      url: this.seo.canonicalUrl(path),
      about: this.businessSchema(detail),
    });

    const [productResult, promotionResult] = await Promise.allSettled([
      firstValueFrom(this.api.listStorefrontProducts(slug, 1, 50, '', { sort: 'newest' })),
      firstValueFrom(this.api.getStorefrontPromotions(slug, 1, 3)),
    ]);
    if (productResult.status === 'fulfilled' && productResult.value.status === 'SUCCESS' && !Array.isArray(productResult.value.data)) {
      this.products.set(productResult.value.data.items || []);
    }
    if (promotionResult.status === 'fulfilled' && promotionResult.value.status === 'SUCCESS' && !Array.isArray(promotionResult.value.data)) {
      this.promotions.set(promotionResult.value.data.items || []);
    }
    this.loading.set(false);
  }

  private businessSchema(data: MarketplaceBusinessDetail): Record<string, unknown> {
    const address = data.business.address;
    const location = data.business.location;
    return {
      '@type': address ? 'LocalBusiness' : 'Organization',
      '@id': this.seo.canonicalUrl(pathForBusiness(data.business.business_slug)) + '#business',
      name: data.storefront.title || data.business.business_name,
      description: data.storefront.description || data.business.business_description || undefined,
      url: this.seo.canonicalUrl(pathForBusiness(data.business.business_slug)),
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

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  async shareStore(): Promise<void> {
    const detail = this.context.detail();
    if (!detail) return;
    const url = window.location.href;
    const title = this.brandName + ' | Official Storefront';
    try {
      if (navigator.share) {
        await navigator.share({ title, text: detail.storefront.description || detail.business.business_description || title, url });
        this.shareFeedback.set('Store link shared.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        this.shareFeedback.set('Store link copied to clipboard.');
      } else {
        this.shareFeedback.set(url);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.shareFeedback.set('Unable to share automatically. Copy the store URL from your browser.');
    }
  }

  whatsappUrl(phone: string): string {
    return 'https://wa.me/' + phone.replace(/\D/g, '');
  }

  hasDirections(data: MarketplaceBusinessDetail): boolean {
    const location = data.business.location;
    const address = data.business.address;
    return (location?.latitude != null && location?.longitude != null)
      || !!(address?.address_line_1 || address?.city || data.business.city);
  }

  directionsUrl(data: MarketplaceBusinessDetail): string {
    const location = data.business.location;
    if (location?.latitude != null && location?.longitude != null) {
      return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(location.latitude + ',' + location.longitude);
    }
    const address = data.business.address;
    const parts = [address?.address_line_1, address?.address_line_2, address?.city, address?.state, address?.postal_code, address?.country_code].filter(Boolean);
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(parts.join(', ') || [data.business.city, data.business.state].filter(Boolean).join(', '));
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  productRoute(product: MarketplaceProduct): string {
    return (product.slug || slugify(product.product_name)) + '-' + (product.public_id || product.id);
  }
}

function pathForBusiness(slug: string): string { return '/store/' + encodeURIComponent(slug); }

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
}
