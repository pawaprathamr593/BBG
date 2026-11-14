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
        <section class="hero" aria-labelledby="storefront-title">
          @if (data.business.cover_image_path) {
            <img class="hero-image" [src]="data.business.cover_image_path" [alt]="brandName + ' storefront cover'" fetchpriority="high" />
          }
          <div class="hero-shade"></div>
          <div class="hero-content">
            <div class="hero-copy">
              <p class="eyebrow"><span class="eyebrow-dot"></span>{{ data.business.category_name || 'DISCOVER OUR BUSINESS' }}</p>
              <h1 id="storefront-title">{{ brandName }}</h1>
              <p class="hero-description">{{ data.storefront.description || data.business.business_description || 'Explore our product collection and connect directly with our team.' }}</p>
              <div class="hero-actions">
                <a class="button button-primary" [routerLink]="['/store', data.business.business_slug, 'products']">Explore products <span aria-hidden="true">↗</span></a>
                <a class="button button-quiet" [routerLink]="['/store', data.business.business_slug, 'about']">Discover our business</a>
              </div>
              <div class="hero-location">
                @if (data.business.city || data.business.state) {
                  <span class="location-icon" aria-hidden="true">⌖</span>
                  <span>{{ data.business.city }}{{ data.business.city && data.business.state ? ', ' : '' }}{{ data.business.state }}</span>
                }
                @if (data.storefront.accept_online_orders) {
                  <span class="hero-separator" aria-hidden="true"></span>
                  <span>Online ordering available</span>
                }
              </div>
            </div>
            <div class="hero-side-note" aria-hidden="true">
              <span class="side-note-line"></span>
              <span>BUSINESS. PRODUCTS. CONNECTIONS.</span>
            </div>
          </div>
          <a class="hero-scroll" href="#featured-products"><span></span>Explore the collection</a>
        </section>

        <section class="intro section-wrap" aria-labelledby="intro-title">
          <div class="intro-kicker"><span>01</span><span>WELCOME</span></div>
          <div class="intro-copy">
            <h2 id="intro-title">A better way to discover <em>{{ brandName }}</em>.</h2>
            <p>{{ data.storefront.description || data.business.business_description || 'Find out more about our business, browse the products we have published, and get in touch with our team.' }}</p>
          </div>
          <a class="text-link" [routerLink]="['/store', data.business.business_slug, 'about']">More about us <span aria-hidden="true">↗</span></a>
        </section>

        <section id="featured-products" class="featured section-wrap" aria-labelledby="featured-title">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>02</span> THE COLLECTION</div>
              <h2 id="featured-title">Explore our products<span class="heading-period">.</span></h2>
              <p>A selection from the products currently published by {{ brandName }}.</p>
            </div>
            <a class="outline-link" [routerLink]="['/store', data.business.business_slug, 'products']">View all products <span aria-hidden="true">↗</span></a>
          </div>

          @if (loading()) {
            <div class="product-grid" aria-label="Loading featured products">
              @for (item of skeletons; track item) { <div class="product-skeleton"><span></span><i></i><i></i><b></b></div> }
            </div>
          } @else if (products().length) {
            <div class="product-grid">
              @for (product of products(); track product.id; let index = $index) {
                <a class="product-card" [routerLink]="['/store', data.business.business_slug, 'products', productRoute(product)]">
                  <div class="product-art" [class.art-alt]="index % 2 === 1">
                    <span class="art-index">{{ (index + 1).toString().padStart(2, '0') }}</span>
                    <span class="art-monogram">{{ product.product_name.slice(0, 1).toUpperCase() }}</span>
                    <span class="art-orbit"></span>
                    @if (product.category_name) { <span class="art-category">{{ product.category_name }}</span> }
                  </div>
                  <div class="product-info">
                    <div class="product-title-row">
                      <h3>{{ product.product_name }}</h3>
                      <span class="product-arrow" aria-hidden="true">↗</span>
                    </div>
                    <p>{{ product.description || 'Discover product details and contact the business.' }}</p>
                    <div class="product-bottom">
                      @if (data.storefront.show_prices && product.selling_price !== undefined) {
                        <strong>{{ data.storefront.currency || '' }} {{ product.selling_price }}</strong>
                      } @else {
                        <span class="price-hidden">Enquire for pricing</span>
                      }
                      <span class="view-label">VIEW DETAILS</span>
                    </div>
                  </div>
                </a>
              }
            </div>
          } @else {
            <div class="empty-products">
              <span class="empty-symbol" aria-hidden="true">✳</span>
              <div><h3>The collection is taking shape.</h3><p>There are no published products to display right now. Visit again soon or contact the business directly.</p></div>
              <a class="text-link" [routerLink]="['/store', data.business.business_slug, 'contact']">Get in touch <span aria-hidden="true">↗</span></a>
            </div>
          }
        </section>

        <section class="business-band" aria-label="Business information">
          <div class="band-inner">
            <div class="band-copy">
              <p class="section-kicker"><span>03</span> CONNECT WITH US</p>
              <h2>Have something in mind?</h2>
              <p>Talk to {{ brandName }} about a product, a requirement, or any questions you may have.</p>
            </div>
            <a class="button band-button" [routerLink]="['/store', data.business.business_slug, 'contact']">Contact the business <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>
    }
  `,
  styles: [`
    :host{display:block;color:var(--text-primary)}
    .home-page{overflow:hidden;background:var(--surface-page)}
    .hero{position:relative;isolation:isolate;display:flex;min-height:clamp(500px,62vw,690px);align-items:center;overflow:hidden;background:#102b20;color:#fff}
    .hero-image,.hero-shade{position:absolute;z-index:-1;inset:0;width:100%;height:100%}
    .hero-image{object-fit:cover;object-position:center 45%;opacity:.62}
    .hero-shade{background:linear-gradient(90deg,rgba(7,25,17,.96) 0%,rgba(8,31,20,.82) 48%,rgba(9,29,20,.18) 100%),linear-gradient(0deg,rgba(4,17,11,.36),transparent 50%)}
    .hero-content{display:flex;width:min(100% - 64px,1240px);align-items:center;justify-content:space-between;gap:30px;margin:0 auto;padding:88px 0 112px}
    .hero-copy{max-width:760px}
    .eyebrow,.section-kicker{display:flex;align-items:center;gap:10px;margin:0 0 22px;font-size:.68rem;font-weight:800;letter-spacing:.17em}
    .eyebrow{color:#d8e8dc}
    .eyebrow-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 5px #f5d92825}
    .hero h1{max-width:760px;margin:0;color:#fff;font-size:clamp(3rem,8.2vw,6.8rem);font-weight:780;letter-spacing:-.075em;line-height:.98;text-wrap:balance}
    .hero-description{max-width:620px;margin:25px 0 0;color:#e0eae3;font-size:clamp(1rem,1.6vw,1.16rem);line-height:1.85}
    .hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
    .button{display:inline-flex;min-height:50px;align-items:center;justify-content:center;gap:22px;padding:0 21px;border:1px solid transparent;border-radius:7px;font-size:.84rem;font-weight:750;text-decoration:none;transition:transform .2s ease,background .2s ease,border-color .2s ease}
    .button:hover{transform:translateY(-2px)}
    .button-primary{background:var(--accent);color:#17251c}
    .button-primary:hover{background:#ffe96a}
    .button-quiet{border-color:#ffffff70;color:#fff;background:#ffffff0c}
    .button-quiet:hover{border-color:#fff;background:#ffffff17}
    .hero-location{display:flex;align-items:center;gap:10px;margin-top:35px;color:#d3e1d7;font-size:.78rem}
    .location-icon{font-size:1.05rem}.hero-separator{width:4px;height:4px;border-radius:50%;background:#a9c6b3}
    .hero-side-note{display:flex;align-items:center;gap:12px;align-self:flex-end;margin-bottom:24px;color:#d1e0d5;font-size:.59rem;font-weight:750;letter-spacing:.16em;writing-mode:vertical-rl}
    .side-note-line{width:1px;height:64px;background:#ffffff80}
    .hero-scroll{position:absolute;right:max(32px,calc((100vw - 1240px)/2));bottom:27px;display:flex;align-items:center;gap:11px;color:#d3e1d7;font-size:.68rem;letter-spacing:.08em;text-decoration:none}
    .hero-scroll span{width:24px;height:1px;background:var(--accent)}
    .section-wrap{width:min(100% - 64px,1160px);margin:0 auto}
    .intro{display:grid;grid-template-columns:100px minmax(0,1fr) auto;align-items:start;gap:35px;padding-top:94px;padding-bottom:94px;border-bottom:1px solid var(--border)}
    .intro-kicker{display:flex;flex-direction:column;gap:9px;color:var(--text-muted);font-size:.61rem;font-weight:800;letter-spacing:.16em}
    .intro-kicker span:first-child,.section-kicker span{color:var(--brand-strong)}
    .intro-copy{max-width:680px}
    .intro h2{margin:-10px 0 18px;font-size:clamp(2rem,4.2vw,3.5rem);font-weight:720;letter-spacing:-.065em;line-height:1.12}
    .intro h2 em{color:var(--brand-strong);font-style:normal}
    .intro-copy p,.section-heading>div>p:last-child{margin:0;color:var(--text-secondary);font-size:.96rem;line-height:1.85}
    .text-link{display:inline-flex;align-items:center;gap:12px;color:var(--brand-strong);font-size:.8rem;font-weight:800;text-decoration:none;white-space:nowrap}
    .text-link span{font-size:1.05rem;transition:transform .18s ease}
    .text-link:hover span{transform:translate(3px,-3px)}
    .intro>.text-link{margin-top:4px}
    .featured{padding-top:92px;padding-bottom:104px}
    .section-heading{display:flex;align-items:end;justify-content:space-between;gap:28px;margin-bottom:35px}
    .section-kicker{gap:12px;margin-bottom:15px;color:var(--text-muted);font-size:.63rem}
    .section-heading h2{margin:0 0 12px;font-size:clamp(2rem,4.5vw,3.55rem);font-weight:740;letter-spacing:-.065em;line-height:1.06}
    .heading-period{color:var(--brand-strong)}
    .section-heading>div>p:last-child{font-size:.88rem}
    .outline-link{display:inline-flex;min-height:45px;align-items:center;gap:16px;padding:0 16px;border:1px solid var(--border);border-radius:7px;color:var(--text-primary);font-size:.78rem;font-weight:750;text-decoration:none;white-space:nowrap;transition:border-color .18s ease,background .18s ease}
    .outline-link:hover{border-color:var(--brand);background:var(--brand-soft)}
    .product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:19px}
    .product-card{min-width:0;overflow:hidden;border:1px solid var(--border);border-radius:10px;background:var(--surface-card);color:var(--text-primary);text-decoration:none;transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
    .product-card:hover{transform:translateY(-5px);border-color:color-mix(in srgb,var(--brand) 45%,var(--border));box-shadow:0 18px 35px #102b2012}
    .product-art{position:relative;display:grid;min-height:210px;place-items:center;overflow:hidden;background:linear-gradient(145deg,#e8f1eb,#d4e3d8 62%,#c5d7ca);color:#174d35}
    .product-art.art-alt{background:linear-gradient(145deg,#f5efcf,#e8e0b4 65%,#d8d09e);color:#524b1a}
    .art-index{position:absolute;top:17px;left:18px;color:#174d3580;font-size:.66rem;font-weight:850;letter-spacing:.12em}
    .art-monogram{position:relative;z-index:1;font-size:6.5rem;font-weight:800;letter-spacing:-.1em;line-height:1;text-shadow:0 10px 28px #173c2b19}
    .art-orbit{position:absolute;width:170px;height:170px;border:1px solid currentColor;border-radius:50%;opacity:.2;transform:translate(35px,18px)}
    .art-orbit:after{position:absolute;inset:18px;border:1px solid currentColor;border-radius:50%;content:""}
    .art-category{position:absolute;right:14px;bottom:13px;max-width:70%;overflow:hidden;padding:6px 9px;border:1px solid #174d3520;border-radius:3px;background:#ffffff9c;color:#174d35;font-size:.58rem;font-weight:800;letter-spacing:.08em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
    .product-info{padding:17px 17px 15px}
    .product-title-row{display:flex;align-items:start;justify-content:space-between;gap:10px}
    .product-title-row h3{overflow:hidden;margin:0;font-size:.98rem;font-weight:760;letter-spacing:-.025em;text-overflow:ellipsis}
    .product-arrow{color:var(--brand-strong);font-size:1rem}
    .product-info>p{display:-webkit-box;min-height:42px;overflow:hidden;margin:10px 0 17px;color:var(--text-secondary);font-size:.76rem;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}
    .product-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:12px;border-top:1px solid var(--border)}
    .product-bottom strong{color:var(--brand-strong);font-size:.87rem}
    .price-hidden{color:var(--text-secondary);font-size:.75rem}
    .view-label{color:var(--text-muted);font-size:.56rem;font-weight:850;letter-spacing:.1em}
    .empty-products{display:flex;align-items:center;gap:22px;padding:30px;border:1px dashed var(--border);border-radius:10px;background:var(--surface-card)}
    .empty-symbol{display:grid;width:54px;height:54px;flex:0 0 54px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-strong);font-size:1.5rem}
    .empty-products h3{margin:0 0 6px;font-size:1.05rem}
    .empty-products p{margin:0;color:var(--text-secondary);font-size:.82rem;line-height:1.65}
    .empty-products .text-link{margin-left:auto}
    .product-skeleton{display:flex;flex-direction:column;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px}
    .product-skeleton span{height:190px;border-radius:6px;background:var(--surface-subtle)}
    .product-skeleton i{height:10px;border-radius:6px;background:var(--surface-subtle)}
    .product-skeleton i:nth-of-type(2){width:65%}
    .product-skeleton b{width:40%;height:14px;margin-top:8px;border-radius:6px;background:var(--surface-subtle)}
    .business-band{background:var(--brand-soft)}
    .band-inner{display:flex;width:min(100% - 64px,1160px);min-height:270px;align-items:center;justify-content:space-between;gap:30px;margin:0 auto;padding:55px 0}
    .band-copy{max-width:650px}
    .band-copy .section-kicker{margin-bottom:13px}
    .band-copy h2{margin:0 0 10px;font-size:clamp(1.8rem,4vw,2.8rem);letter-spacing:-.055em}
    .band-copy>p:last-child{margin:0;color:var(--text-secondary);font-size:.9rem;line-height:1.7}
    .band-button{flex:0 0 auto;background:var(--brand);color:#fff}
    :host-context(html[data-theme="dark"]) .band-button{color:#17251c}
    @media(max-width:1000px){.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.intro{grid-template-columns:70px minmax(0,1fr);gap:22px}.intro>.text-link{grid-column:2}.hero-side-note{display:none}}
    @media(max-width:650px){.hero{min-height:570px}.hero-content{width:calc(100% - 40px);padding:65px 0 100px}.hero h1{font-size:clamp(3rem,15vw,5rem)}.hero-description{font-size:.96rem}.hero-actions{align-items:stretch;flex-direction:column;max-width:300px}.button{justify-content:space-between}.hero-scroll{right:20px;bottom:22px}.section-wrap,.band-inner{width:calc(100% - 40px)}.intro{grid-template-columns:1fr;gap:18px;padding-top:62px;padding-bottom:62px}.intro-kicker{flex-direction:row}.intro h2{margin:0 0 14px;font-size:2.35rem}.intro>.text-link{grid-column:1}.featured{padding-top:64px;padding-bottom:70px}.section-heading{align-items:flex-start;flex-direction:column;gap:18px}.section-heading h2{font-size:2.5rem}.product-grid{gap:12px}.product-art{min-height:155px}.art-monogram{font-size:4.8rem}.product-info{padding:13px}.product-info>p{font-size:.72rem}.product-title-row h3{font-size:.88rem}.view-label{display:none}.empty-products{align-items:flex-start;flex-direction:column;padding:22px}.empty-products .text-link{margin-left:0}.band-inner{align-items:flex-start;flex-direction:column;justify-content:center;padding:48px 0}.band-button{width:100%}}
    @media(max-width:390px){.product-grid{grid-template-columns:1fr}.product-art{min-height:210px}.art-monogram{font-size:6rem}}
    @media(prefers-reduced-motion:reduce){.button,.text-link span,.product-card,.outline-link{transition:none}.button:hover,.product-card:hover{transform:none}}
  `],
})
export class StorefrontHome {
  readonly context = inject(StorefrontContextService);
  private readonly api = inject(MarketplaceApiService);
  private readonly seo = inject(StorefrontSeoService);
  readonly products = signal<MarketplaceProduct[]>([]);
  readonly loading = signal(true);
  readonly skeletons = [1, 2, 3, 4];

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
    const description = detail.storefront.description || detail.business.business_description || 'Explore products and contact ' + name + ' through its official BBG storefront.';
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
      const response = await firstValueFrom(this.api.listStorefrontProducts(slug, 1, 4));
      if (response.status === 'SUCCESS' && !Array.isArray(response.data)) {
        this.products.set(response.data.items || []);
      }
    } catch {
      // Keep the storefront usable if the optional featured-product request fails.
    } finally {
      this.loading.set(false);
    }
  }

  private businessSchema(data: MarketplaceBusinessDetail): Record<string, unknown> {
    const address = data.business.address;
    const location = data.business.location;
    return {
      '@type': 'LocalBusiness',
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
