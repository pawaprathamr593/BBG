import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MarketplaceApiService, MarketplaceBusinessDetail, MarketplaceProduct } from '../../core/marketplace/marketplace-api.service';
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
            <p class="eyebrow"><span>OFFICIAL STOREFRONT</span><i></i> {{ data.business.category_name || 'DISCOVER OUR BUSINESS' }}</p>
            <div class="store-identity">
              @if (data.business.logo_path) {
                <img class="store-logo" [src]="data.business.logo_path" [alt]="brandName + ' logo'" />
              } @else {
                <span class="store-logo-fallback" aria-hidden="true">{{ brandName.slice(0, 1).toUpperCase() }}</span>
              }
              <div class="identity-copy">
                <span class="identity-caption">WELCOME TO</span>
                <h1 id="storefront-title">{{ brandName }}<b>.</b></h1>
              </div>
            </div>
            <p class="hero-description">{{ data.storefront.description || data.business.business_description || 'Explore this business storefront and get in touch for products, services and more information.' }}</p>
            <div class="hero-actions">
              <a class="primary-button" [routerLink]="['/store', data.business.business_slug, 'products']">Explore products <span aria-hidden="true">↗</span></a>
              <a class="secondary-button" [routerLink]="['/store', data.business.business_slug, 'contact']">Contact the store</a>
            </div>
            <div class="hero-meta">
              <span><i aria-hidden="true">✓</i> Official BBG storefront</span>
              @if (data.storefront.accept_online_orders) { <span><i aria-hidden="true">✓</i> Online orders available</span> }
              @if (data.business.city || data.business.state) {
                <span><i aria-hidden="true">⌖</i> {{ data.business.city }}{{ data.business.city && data.business.state ? ', ' : '' }}{{ data.business.state }}</span>
              }
            </div>
          </div>
          <div class="hero-decoration" aria-hidden="true"><span>00</span><i></i><b>DISCOVER</b></div>
        </section>

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
              <h2 id="products-heading">Shop our products</h2>
              <p>Browse the products currently published by {{ brandName }}.</p>
            </div>
            <a class="view-all" [routerLink]="['/store', data.business.business_slug, 'products']">View all products <span aria-hidden="true">→</span></a>
          </div>

          @if (loading()) {
            <div class="product-grid" aria-label="Loading products">
              @for (item of skeletons; track item) { <div class="product-skeleton"><span></span><i></i><i></i><b></b></div> }
            </div>
          } @else if (products().length) {
            <div class="product-grid">
              @for (product of products(); track product.id; let index = $index) {
                <a class="product-card" [routerLink]="['/store', data.business.business_slug, 'products', productRoute(product)]">
                  <div class="product-image" [class.image-alt]="index % 2 === 1">
                    <span class="category-tag">{{ product.category_name || 'PRODUCT' }}</span>
                    <span class="product-initial">{{ product.product_name.slice(0, 1).toUpperCase() }}</span>
                  </div>
                  <div class="product-details">
                    @if (product.brand_name) { <span class="product-brand">{{ product.brand_name }}</span> }
                    <h3>{{ product.product_name }}</h3>
                    <p>{{ product.description || 'View product details and contact the business for more information.' }}</p>
                    <div class="product-purchase">
                      @if (data.storefront.show_prices && product.selling_price !== undefined) {
                        <strong>{{ data.storefront.currency || '' }} {{ product.selling_price }}</strong>
                      } @else { <strong class="enquire-price">Enquire for price</strong> }
                      <span>View details <b aria-hidden="true">→</b></span>
                    </div>
                  </div>
                </a>
              }
            </div>
          } @else {
            <div class="empty-products">
              <span aria-hidden="true">⌕</span>
              <div><h3>Products will appear here</h3><p>{{ brandName }} has not published any products to this storefront yet. Please check back later or contact the business.</p></div>
              <a [routerLink]="['/store', data.business.business_slug, 'contact']">Contact the business →</a>
            </div>
          }
        </section>

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
    .hero-meta{display:flex;flex-wrap:wrap;gap:10px 20px;margin-top:28px;color:#dce8df;font-size:.7rem}
    .hero-meta span{display:inline-flex;align-items:center;gap:7px}
    .hero-meta i{color:var(--accent);font-style:normal;font-weight:850}
    .hero-decoration{position:absolute;right:max(32px,calc((100vw - 1160px)/2));bottom:42px;display:flex;align-items:center;gap:12px;color:#d1e1d6;font-size:.58rem;font-weight:800;letter-spacing:.15em;writing-mode:vertical-rl}
    .hero-decoration>span{color:var(--accent);font-size:.8rem}
    .hero-decoration>i{width:1px;height:55px;background:#ffffff7a}
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
    .product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:17px}
    .product-card{min-width:0;overflow:hidden;border:1px solid var(--border);border-radius:9px;background:var(--surface-card);color:var(--text-primary);text-decoration:none;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
    .product-card:hover{transform:translateY(-3px);border-color:var(--brand);box-shadow:0 12px 28px #1d392510}
    .product-image{position:relative;display:grid;min-height:205px;place-items:center;overflow:hidden;background:linear-gradient(145deg,#edf3ee,#dbe8de);color:#315d47}
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
    .product-skeleton{display:flex;flex-direction:column;gap:11px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--surface-card)}
    .product-skeleton span{height:195px;border-radius:5px;background:var(--surface-subtle)}
    .product-skeleton i{height:9px;border-radius:5px;background:var(--surface-subtle)}
    .product-skeleton i:nth-of-type(2){width:65%}
    .product-skeleton b{width:40%;height:13px;margin-top:5px;border-radius:5px;background:var(--surface-subtle)}
    .store-contact{display:flex;align-items:center;justify-content:space-between;gap:25px;padding:38px max(32px,calc((100vw - 1160px)/2));background:var(--brand-soft)}
    .store-contact .eyebrow{margin-bottom:8px}
    .store-contact h2{margin:0 0 7px;font-size:clamp(1.35rem,2.7vw,1.9rem);font-weight:590;letter-spacing:-.04em}
    .store-contact p:last-child{margin:0;color:var(--text-secondary);font-size:.78rem;line-height:1.6}
    .store-contact>a{display:inline-flex;min-height:43px;align-items:center;justify-content:space-between;gap:20px;padding:0 14px;border:1px solid var(--border);border-radius:5px;background:var(--surface-card);color:var(--text-primary);font-size:.72rem;font-weight:650;text-decoration:none;white-space:nowrap}
    @media(max-width:1000px){.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-inner{grid-template-columns:minmax(0,1fr) minmax(260px,.8fr);gap:28px}}
    @media(max-width:650px){.hero-inner,.shopping-benefits,.products-section{width:calc(100% - 40px)}.hero-inner{padding:52px 0}.store-identity{align-items:flex-start;gap:13px}.store-logo,.store-logo-fallback{width:62px;height:62px;flex-basis:62px}.identity-caption{font-size:.55rem}.hero-inner h1{font-size:clamp(2.65rem,11vw,4rem)}.hero-description{font-size:.88rem}.hero-meta{gap:9px 13px}.hero-decoration{right:18px;bottom:24px}.shopping-benefits{grid-template-columns:1fr;gap:9px;padding:18px 0}.shopping-benefits>div{padding:3px 0}.products-section{padding:46px 0 55px}.section-heading{align-items:flex-start;flex-direction:column;gap:13px}.product-grid{gap:11px}.product-image{min-height:150px}.product-initial{font-size:4.5rem}.product-details{padding:12px}.product-details h3{font-size:.82rem}.product-details>p{font-size:.68rem}.product-purchase>span{font-size:.6rem}.store-contact{align-items:flex-start;flex-direction:column;padding:30px 18px}.store-contact>a{width:100%}.empty-products{align-items:flex-start;flex-direction:column;padding:20px}.empty-products>a{margin-left:0}}
    @media(max-width:390px){.product-grid{grid-template-columns:1fr}.product-image{min-height:205px}.product-initial{font-size:5.5rem}}
    @media(prefers-reduced-motion:reduce){.primary-button,.secondary-button,.product-card{transition:none}.primary-button:hover,.secondary-button:hover,.product-card:hover{transform:none}}
  `],
})
export class StorefrontHome {
  readonly context = inject(StorefrontContextService);
  private readonly api = inject(MarketplaceApiService);
  private readonly seo = inject(StorefrontSeoService);
  readonly products = signal<MarketplaceProduct[]>([]);
  readonly loading = signal(true);
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

    try {
      const response = await firstValueFrom(this.api.listStorefrontProducts(slug, 1, 8, '', { sort: 'newest' }));
      if (response.status === 'SUCCESS' && !Array.isArray(response.data)) {
        this.products.set(response.data.items || []);
      }
    } catch {
      // Keep the storefront usable if the optional product request fails.
    } finally {
      this.loading.set(false);
    }
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

  productRoute(product: MarketplaceProduct): string {
    return (product.slug || slugify(product.product_name)) + '-' + (product.public_id || product.id);
  }
}

function pathForBusiness(slug: string): string { return '/store/' + encodeURIComponent(slug); }

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
}
