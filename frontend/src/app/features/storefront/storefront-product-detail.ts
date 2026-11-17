import { ChangeDetectionStrategy, Component, effect, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MarketplaceApiService, MarketplaceProductDetail } from '../../core/marketplace/marketplace-api.service';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-storefront-product-detail',
  imports: [RouterLink],
  template: `
    @if (loading()) {
      <main class="loading-state" role="status"><span class="loader"></span><p>Loading product information…</p></main>
    } @else if (error()) {
      <main class="error-state" role="alert"><span class="error-mark" aria-hidden="true">!</span><h1>Product unavailable</h1><p>{{ error() }}</p><a [routerLink]="['/store', slug, 'products']">Return to products <span aria-hidden="true">↗</span></a></main>
    } @else if (detail(); as data) {
      <main class="product-page">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a [routerLink]="['/store', slug]">Home</a><span aria-hidden="true">/</span>
          <a [routerLink]="['/store', slug, 'products']">Products</a><span aria-hidden="true">/</span>
          <span aria-current="page">{{ data.product.product_name }}</span>
        </nav>

        <article class="product-layout">
          <div class="visual-column">
            <div class="product-visual" [class.visual-alt]="(data.product.category_name?.length || 0) % 2 === 0">
              <span class="visual-kicker">{{ data.product.category_name || 'PRODUCT DETAILS' }}</span>
              <span class="visual-monogram">{{ data.product.product_name.slice(0, 1).toUpperCase() }}</span>
              <span class="visual-orbit"></span>
              <span class="visual-caption">BBG / {{ data.product.product_code }}</span>
            </div>
            <div class="visual-note"><span aria-hidden="true">✳</span><p>Product information provided by {{ businessName }}.</p></div>
          </div>

          <div class="product-copy">
            <p class="eyebrow">{{ data.product.category_name || 'PRODUCT' }}</p>
            <h1>{{ data.product.product_name }}</h1>
            @if (data.product.brand_name) { <p class="brand-name">{{ data.product.brand_name }}</p> }
            <p class="description">{{ data.product.description || 'Contact the business for further information about this product.' }}</p>

            <div class="price-panel">
              <span class="price-label">PRICE</span>
              @if (context.detail()?.storefront?.show_prices && data.product.selling_price !== undefined) {
                <strong>{{ context.detail()?.storefront?.currency || '' }} {{ data.product.selling_price }}</strong>
                <small>Displayed price from the business</small>
              } @else {
                <strong class="price-enquiry">Contact for pricing</strong>
                <small>Get in touch with the business for price details</small>
              }
            </div>

            <div class="product-facts">
              <div><span>Product code</span><strong>{{ data.product.product_code }}</strong></div>
              <div><span>Unit</span><strong>{{ data.product.unit.name }} ({{ data.product.unit.symbol }})</strong></div>
              @if (data.product.is_variant_product) { <div><span>Product type</span><strong>Available in variants</strong></div> }
              @if (data.product.brand_name) { <div><span>Brand</span><strong>{{ data.product.brand_name }}</strong></div> }
            </div>

            @if (data.variants.length) {
              <section class="variants" aria-labelledby="variants-title">
                <div class="variants-heading"><p class="eyebrow">OPTIONS</p><h2 id="variants-title">Available variants</h2></div>
                <div class="variant-list">
                  @for (variant of data.variants; track variant.id) {
                    <div class="variant-row">
                      <div><strong>{{ variant.variant_name }}</strong><span>{{ variant.variant_code }}</span></div>
                      @if (context.detail()?.storefront?.show_prices && variant.selling_price !== undefined) {
                        <b>{{ context.detail()?.storefront?.currency || '' }} {{ variant.selling_price }}</b>
                      }
                    </div>
                  }
                </div>
              </section>
            }

            <div class="product-actions">
              <a class="primary-action" [routerLink]="['/store', slug, 'contact']">Enquire about this product <span aria-hidden="true">↗</span></a>
              @if (context.detail()?.storefront?.whatsapp_enabled && context.detail()?.business?.whatsapp_number) {
                <a class="secondary-action" [href]="whatsappUrl(context.detail()!.business.whatsapp_number!)" target="_blank" rel="noopener noreferrer">Chat on WhatsApp ↗</a>
              }
            </div>
            <p class="seller-note">Offered by <strong>{{ businessName }}</strong></p>
          </div>
        </article>

        <section class="more-info">
          <div><p class="eyebrow">NEED MORE INFORMATION?</p><h2>Talk directly with {{ businessName }}.</h2><p>For availability, specifications, pricing or other product questions, contact the business using its published details.</p></div>
          <a [routerLink]="['/store', slug, 'contact']">View contact details <span aria-hidden="true">↗</span></a>
        </section>
      </main>
    }
  `,
  styles: [`
    :host{display:block;color:var(--text-primary);background:var(--surface-page)}
    .product-page{width:min(100% - 64px,1160px);min-height:65vh;margin:0 auto;padding:32px 0 82px}
    .breadcrumbs{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:30px;color:var(--text-muted);font-size:.72rem}
    .breadcrumbs a{color:var(--text-secondary);text-decoration:none}.breadcrumbs a:hover{color:var(--brand-strong)}.breadcrumbs span[aria-current]{overflow:hidden;max-width:320px;color:var(--text-primary);text-overflow:ellipsis;white-space:nowrap}
    .product-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(35px,6vw,78px);align-items:start}
    .product-visual{position:relative;display:grid;min-height:510px;place-items:center;overflow:hidden;border-radius:10px;background:linear-gradient(145deg,#e8f1eb,#c8ddcf 65%,#b8d0bf);color:#174d35}
    .product-visual.visual-alt{background:linear-gradient(145deg,#f5efcf,#e1d9a8 65%,#d3ca93);color:#524b1a}
    .visual-kicker{position:absolute;top:25px;left:25px;max-width:70%;overflow:hidden;font-size:.65rem;font-weight:850;letter-spacing:.13em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
    .visual-monogram{position:relative;z-index:1;font-size:clamp(10rem,20vw,16rem);font-weight:820;letter-spacing:-.12em;line-height:1;text-shadow:0 16px 38px #102b201b}
    .visual-orbit{position:absolute;width:340px;height:340px;border:1px solid currentColor;border-radius:50%;opacity:.2}
    .visual-orbit:before,.visual-orbit:after{position:absolute;inset:24px;border:1px solid currentColor;border-radius:50%;content:""}
    .visual-orbit:after{inset:48px}
    .visual-caption{position:absolute;right:24px;bottom:23px;font-size:.61rem;font-weight:850;letter-spacing:.13em;opacity:.7}
    .visual-note{display:flex;align-items:center;gap:12px;margin-top:15px;color:var(--text-secondary)}
    .visual-note>span{color:var(--brand-strong);font-size:1.1rem}.visual-note p{margin:0;font-size:.73rem}
    .product-copy{padding:7px 0}
    .eyebrow{margin:0 0 12px;color:var(--brand-strong);font-size:.64rem;font-weight:850;letter-spacing:.15em;text-transform:uppercase}
    .product-copy h1{margin:0;font-size:clamp(2.4rem,5vw,4rem);font-weight:760;letter-spacing:-.07em;line-height:1.04;text-wrap:balance}
    .brand-name{margin:12px 0 0;color:var(--text-secondary);font-size:.9rem;font-weight:650}
    .description{margin:24px 0 0;color:var(--text-secondary);font-size:.92rem;line-height:1.9;white-space:pre-line}
    .price-panel{display:flex;align-items:flex-end;flex-wrap:wrap;gap:8px 14px;margin-top:30px;padding:20px;border:1px solid var(--border);border-radius:8px;background:var(--surface-card)}
    .price-label{width:100%;color:var(--text-muted);font-size:.6rem;font-weight:850;letter-spacing:.14em}
    .price-panel strong{color:var(--brand-strong);font-size:1.55rem;letter-spacing:-.04em}
    .price-panel .price-enquiry{font-size:1.1rem}
    .price-panel small{align-self:center;color:var(--text-secondary);font-size:.68rem}
    .product-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px;margin-top:22px}
    .product-facts>div{display:flex;flex-direction:column;gap:6px;padding:13px 0;border-bottom:1px solid var(--border)}
    .product-facts span{color:var(--text-muted);font-size:.68rem}.product-facts strong{overflow-wrap:anywhere;font-size:.78rem}
    .variants{margin-top:29px}.variants-heading{margin-bottom:13px}.variants-heading .eyebrow{margin-bottom:5px}.variants-heading h2{margin:0;font-size:1.15rem;letter-spacing:-.03em}
    .variant-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 0;border-top:1px solid var(--border)}
    .variant-row>div{display:flex;flex-direction:column;gap:5px}.variant-row strong{font-size:.8rem}.variant-row span{color:var(--text-muted);font-size:.69rem}.variant-row>b{color:var(--brand-strong);font-size:.82rem}
    .product-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}
    .primary-action,.secondary-action{display:inline-flex;min-height:49px;align-items:center;justify-content:space-between;gap:18px;padding:0 17px;border-radius:6px;font-size:.77rem;font-weight:750;text-decoration:none}
    .primary-action{flex:1;background:var(--brand);color:#fff}.secondary-action{border:1px solid var(--border);color:var(--text-primary)}
    :host-context(html[data-theme="dark"]) .primary-action{color:#17251c}
    .seller-note{margin:18px 0 0;color:var(--text-muted);font-size:.72rem}.seller-note strong{color:var(--text-secondary)}
    .more-info{display:flex;align-items:center;justify-content:space-between;gap:25px;margin-top:85px;padding:36px;border-radius:9px;background:var(--brand-soft)}
    .more-info .eyebrow{margin-bottom:9px}.more-info h2{margin:0 0 9px;font-size:clamp(1.4rem,3vw,2rem);letter-spacing:-.05em}
    .more-info p:last-child{max-width:670px;margin:0;color:var(--text-secondary);font-size:.8rem;line-height:1.7}
    .more-info>a{display:inline-flex;min-height:44px;align-items:center;gap:15px;padding:0 15px;border:1px solid var(--border);border-radius:5px;background:var(--surface-card);color:var(--text-primary);font-size:.75rem;font-weight:750;text-decoration:none;white-space:nowrap}
    .loading-state,.error-state{display:flex;min-height:55vh;align-items:center;flex-direction:column;justify-content:center;padding:40px 20px;text-align:center}
    .loading-state p,.error-state p{color:var(--text-secondary);font-size:.85rem}.loader{width:30px;height:30px;border:3px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}
    .error-mark{display:grid;width:48px;height:48px;place-items:center;border-radius:50%;background:var(--brand-soft);color:var(--brand-strong);font-size:1.3rem;font-weight:850}
    .error-state h1{margin:16px 0 0;font-size:1.8rem}.error-state a{margin-top:12px;color:var(--brand-strong);font-size:.8rem;font-weight:750;text-decoration:none}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:850px){.product-layout{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:30px}.product-visual{min-height:400px}.visual-orbit{width:270px;height:270px}}
    @media(max-width:650px){.product-page{width:calc(100% - 36px);padding-top:22px;padding-bottom:55px}.breadcrumbs{margin-bottom:20px}.product-layout{grid-template-columns:1fr;gap:25px}.product-visual{min-height:310px}.visual-monogram{font-size:9rem}.visual-orbit{width:230px;height:230px}.product-copy h1{font-size:2.7rem}.more-info{align-items:flex-start;flex-direction:column;margin-top:55px;padding:25px}.more-info>a{width:100%;justify-content:space-between}}
    @media(prefers-reduced-motion:reduce){.loader{animation:none}}
  `],
})
export class StorefrontProductDetail implements OnInit {
  readonly context = inject(StorefrontContextService);
  private readonly api = inject(MarketplaceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(StorefrontSeoService);

  readonly detail = signal<MarketplaceProductDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly slug = this.route.parent?.snapshot.paramMap.get('businessSlug') || '';

  constructor() {
    effect(() => {
      const value = this.detail();
      const business = this.context.detail();
      if (!value || !business) return;

      const product = value.product;
      const businessName = business.storefront.title || business.business.business_name;
      const description = product.description || 'Explore ' + product.product_name + ' from ' + businessName + '. Contact the business for further information.';
      const routeSlug = this.route.snapshot.paramMap.get('productSlug') || '';
      const path = '/store/' + encodeURIComponent(this.slug) + '/products/' + routeSlug;
      const currency = business.storefront.currency;
      const showPrice = business.storefront.show_prices && product.selling_price !== undefined && !!currency;

      this.seo.update(product.product_name + ' | ' + businessName, description, path, {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.product_name,
        description,
        sku: product.product_code,
        url: this.seo.canonicalUrl(path),
        ...(product.brand_name ? { brand: { '@type': 'Brand', name: product.brand_name } } : {}),
        ...(showPrice ? {
          offers: {
            '@type': 'Offer',
            price: String(product.selling_price),
            priceCurrency: currency,
            seller: { '@type': 'Organization', name: businessName },
          },
        } : {}),
      });
    });
  }

  get businessName(): string {
    const data = this.context.detail();
    return data?.storefront.title || data?.business.business_name || 'Business';
  }

  async ngOnInit(): Promise<void> {
    const routeSlug = this.route.snapshot.paramMap.get('productSlug') || '';
    const publicId = routeSlug.slice(routeSlug.lastIndexOf('-') + 1);
    if (!this.slug || !publicId || publicId === routeSlug) {
      this.error.set('This product URL is not valid.');
      this.loading.set(false);
      return;
    }

    try {
      const response = await firstValueFrom(this.api.getStorefrontProduct(this.slug, publicId));
      if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
        throw new Error(response.msgArr?.[0] || 'This published product could not be found.');
      }

      const value = response.data as MarketplaceProductDetail;
      this.detail.set(value);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load this product.');
    } finally {
      this.loading.set(false);
    }
  }

  whatsappUrl(phone: string): string {
    return 'https://wa.me/' + phone.replace(/\D/g, '');
  }
}
