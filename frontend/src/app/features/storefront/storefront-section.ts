import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MarketplaceApiService, MarketplaceBusinessDetail, MarketplaceCategory, MarketplaceProduct } from '../../core/marketplace/marketplace-api.service';
import { FilterDrawer } from '../../shared/filter-drawer/filter-drawer';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

type Section = 'products' | 'about' | 'contact';
type ProductSort = 'newest' | 'popular' | 'nearby' | 'price_low' | 'price_high' | 'name';
type ProductFilterValues = { categoryId: string; brand: string; city: string; state: string; minPrice: number | null; maxPrice: number | null; onlineOnly: boolean; variantsOnly: boolean; withImages: boolean };
type ProductFilterKey = keyof ProductFilterValues;

@Component({
  selector: 'app-storefront-section',
  imports: [FormsModule, RouterLink, FilterDrawer],
  template: `
    @if (context.detail(); as data) {
      <main class="page-shell">
        @if (section === 'products') {
          <section class="page-hero products-hero" aria-labelledby="page-title">
            <div class="hero-inner">
              <p class="eyebrow"><span>THE COLLECTION</span><i></i> {{ brandName }}</p>
              <h1 id="page-title">Products<span>.</span></h1>
              <p>Browse the products currently published by {{ brandName }}. Find the details you need and connect with the business directly.</p>
              <div class="hero-meta">
                <span>{{ pagination().total }} {{ pagination().total === 1 ? 'product' : 'products' }} listed</span>
                @if (data.business.city || data.business.state) {
                  <span class="meta-divider"></span>
                  <span>{{ data.business.city }}{{ data.business.city && data.business.state ? ', ' : '' }}{{ data.business.state }}</span>
                }
              </div>
            </div>
            <div class="hero-decoration" aria-hidden="true"><span>01</span><i></i><b>DISCOVER</b></div>
          </section>

          <section class="catalogue content-wrap" aria-labelledby="catalogue-heading">
            <div class="catalogue-toolbar">
              <div>
                <p class="section-label">OUR CATALOGUE</p>
                <h2 id="catalogue-heading">Find what you're looking for.</h2>
              </div>
              <form class="search-form" role="search" (submit)="submitSearch($event)">
                <label class="visually-hidden" for="storefront-product-search">Search products</label>
                <span class="search-icon" aria-hidden="true">⌕</span>
                <input id="storefront-product-search" type="search" [value]="searchTerm()" (input)="updateSearch($event)" placeholder="Search products..." autocomplete="off" />
                @if (searchTerm()) {
                  <button class="clear-search" type="button" aria-label="Clear search" (click)="clearSearch()">×</button>
                }
                <button class="search-button" type="submit" [disabled]="loading()">Search</button>
              </form>
              <div class="catalogue-tools">
                <label class="sort-control"><span>Sort by</span>
                  <select name="store-sort" [ngModel]="sort" (ngModelChange)="sortChanged($event)">
                    <option value="newest">Newly added</option>
                    <option value="popular">Most popular</option>
                    <option value="nearby">Nearby first</option>
                    <option value="price_low">Price: low to high</option>
                    <option value="price_high">Price: high to low</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </label>
                <button class="filter-trigger" type="button" (click)="setFiltersOpen(true)">
                  <span aria-hidden="true">☷</span> Filters
                  @if (activeFilterCount()) { <b>{{ activeFilterCount() }}</b> }
                </button>
              </div>
            </div>

            @if (activeFilterChips().length) {
              <div class="active-filters" aria-label="Applied filters">
                <span class="active-filter-caption">Applied filters</span>
                @for (chip of activeFilterChips(); track chip.key) {
                  <button class="filter-chip" type="button" (click)="removeFilter(chip.key)">{{ chip.label }} <span aria-hidden="true">×</span></button>
                }
                <button class="clear-active-filters" type="button" (click)="clearFilters()">Clear all</button>
              </div>
            }

            <app-filter-drawer
              [open]="filtersOpen()"
              [activeCount]="activeFilterCount()"
              (openChange)="setFiltersOpen($event)"
              (apply)="applyFilters()"
              (reset)="resetDraftFilters()">
              <form class="drawer-filters" aria-label="Advanced product filters">
                @if (filterNotice()) { <p class="drawer-notice" role="alert">{{ filterNotice() }}</p> }
                <div class="filter-field">
                  <label for="store-product-category">Category</label>
                  <select id="store-product-category" name="category" [(ngModel)]="draftFilters.categoryId">
                    <option value="">All product categories</option>
                    @for (category of categories(); track category.id) { <option [value]="category.id">{{ category.category_name }}</option> }
                  </select>
                </div>
                <div class="filter-field"><label for="store-product-brand">Brand</label><input id="store-product-brand" name="brand" [(ngModel)]="draftFilters.brand" placeholder="Any brand" /></div>
                <div class="filter-field"><label for="store-product-city">City</label><input id="store-product-city" name="city" [(ngModel)]="draftFilters.city" placeholder="Any city" /></div>
                <div class="filter-field"><label for="store-product-state">State</label><input id="store-product-state" name="state" [(ngModel)]="draftFilters.state" placeholder="Any state" /></div>
                <div class="filter-field"><label for="store-product-min-price">Minimum price (₹)</label><input id="store-product-min-price" name="minPrice" type="number" min="0" step="0.01" [(ngModel)]="draftFilters.minPrice" placeholder="No minimum" /></div>
                <div class="filter-field"><label for="store-product-max-price">Maximum price (₹)</label><input id="store-product-max-price" name="maxPrice" type="number" min="0" step="0.01" [(ngModel)]="draftFilters.maxPrice" placeholder="No maximum" /></div>
                <label class="check-field"><input type="checkbox" name="onlineOnly" [(ngModel)]="draftFilters.onlineOnly" /><span>Businesses accepting online orders only</span></label>
                <label class="check-field"><input type="checkbox" name="variantsOnly" [(ngModel)]="draftFilters.variantsOnly" /><span>Variant products only</span></label>
                <label class="check-field"><input type="checkbox" name="withImages" [(ngModel)]="draftFilters.withImages" /><span>Products with images</span></label>
              </form>
            </app-filter-drawer>

            @if (filterNotice()) { <p class="filter-notice" role="status">{{ filterNotice() }}</p> }
            @if (loading()) {
              <div class="catalogue-grid" aria-label="Loading products">
                @for (item of skeletons; track item) { <div class="product-skeleton"><span></span><i></i><i></i><b></b></div> }
              </div>
            } @else if (products().length) {
              <p class="results-summary" aria-live="polite">
                Showing {{ resultStart }}–{{ resultEnd }} of {{ pagination().total }} {{ pagination().total === 1 ? 'result' : 'results' }}
                @if (searchTerm().trim()) { <span>for “{{ searchTerm().trim() }}”</span> }
                @if (sort === 'nearby') { <span> · sorted by distance</span> }
              </p>
              <div class="catalogue-grid">
                @for (product of products(); track product.id; let index = $index) {
                  <a class="product-card" [routerLink]="['/store', data.business.business_slug, 'products', productRoute(product)]">
                    <div class="product-art" [class.art-alt]="index % 2 === 1">
                      <span class="art-index">{{ ((pagination().page - 1) * pagination().page_size + index + 1).toString().padStart(2, '0') }}</span>
                      <span class="art-monogram">{{ product.product_name.slice(0, 1).toUpperCase() }}</span>
                      <span class="art-orbit"></span>
                      @if (product.category_name) { <span class="art-category">{{ product.category_name }}</span> }
                    </div>
                    <div class="product-info">
                      <div class="product-title-row"><h3>{{ product.product_name }}</h3><span aria-hidden="true">↗</span></div>
                      @if (product.brand_name) { <span class="product-brand">{{ product.brand_name }}</span> }
                      @if (sort === 'nearby' && product.distance_km !== undefined) { <span class="product-meta">{{ product.distance_km }} km away</span> }
                      @if (sort === 'popular' && product.popularity) { <span class="product-meta">{{ product.popularity.engagements }} views and likes</span> }
                      <p>{{ product.description || 'View product information and contact the business for details.' }}</p>
                      <div class="product-bottom">
                        @if (data.storefront.show_prices && product.selling_price !== undefined) {
                          <strong>{{ data.storefront.currency || '' }} {{ product.selling_price }}</strong>
                        } @else { <span>Enquire for pricing</span> }
                        <small>VIEW DETAILS</small>
                      </div>
                    </div>
                  </a>
                }
              </div>
              @if (totalPages > 1) {
                <nav class="pagination" aria-label="Product pages">
                  @if (pagination().page > 1) {
                    <a [routerLink]="[]" [queryParams]="{ page: pagination().page - 1, q: searchTerm().trim() || null }">← Previous</a>
                  } @else { <span class="page-disabled">← Previous</span> }
                  <span>Page <strong>{{ pagination().page }}</strong> of {{ totalPages }}</span>
                  @if (pagination().page < totalPages) {
                    <a [routerLink]="[]" [queryParams]="{ page: pagination().page + 1, q: searchTerm().trim() || null }">Next →</a>
                  } @else { <span class="page-disabled">Next →</span> }
                </nav>
              }
            } @else if (loadError()) {
              <div class="empty-state" role="alert">
                <span class="empty-icon" aria-hidden="true">!</span>
                <h2>Catalogue temporarily unavailable</h2>
                <p>{{ loadError() }}</p>
                <button class="reset-button" type="button" (click)="loadProducts(pagination().page, searchTerm())">Try again</button>
              </div>
            } @else {
              <div class="empty-state">
                <span class="empty-icon" aria-hidden="true">⌕</span>
                <h2>{{ searchTerm().trim() ? 'No matching products found' : 'No products published yet' }}</h2>
                <p>{{ searchTerm().trim() ? 'Try a different product name or clear your search to browse the catalogue.' : brandName + ' has not published products to this catalogue yet. Please check back later or contact the business.' }}</p>
                @if (searchTerm().trim()) { <button class="reset-button" type="button" (click)="clearSearch()">Clear search</button> }
                @if (activeFilterCount() || sort !== 'newest') { <button class="reset-button" type="button" (click)="clearAllFilters()">Clear all filters</button> }
                <a class="contact-text-link" [routerLink]="['/store', data.business.business_slug, 'contact']">Contact the business <span aria-hidden="true">↗</span></a>
              </div>
            }
          </section>
        }

        @if (section === 'about') {
          <section class="page-hero about-hero" aria-labelledby="page-title">
            @if (data.business.cover_image_path) { <img class="about-cover" [src]="data.business.cover_image_path" [alt]="brandName + ' business cover image'" /> }
            <div class="about-shade"></div>
            <div class="hero-inner">
              <p class="eyebrow"><span>GET TO KNOW US</span><i></i> {{ data.business.category_name || 'OUR BUSINESS' }}</p>
              <h1 id="page-title">About <span>{{ brandName }}</span><b>.</b></h1>
              <p>{{ data.storefront.description || data.business.business_description || 'Learn more about the business and find out how to get in touch.' }}</p>
            </div>
          </section>

          <section class="about-content content-wrap">
            <div class="about-main">
              <p class="section-label">OUR BUSINESS</p>
              <div class="business-identity">
                @if (data.business.logo_path) { <img [src]="data.business.logo_path" [alt]="brandName + ' logo'" /> }
                @else { <span class="identity-mark">{{ brandName.slice(0, 1).toUpperCase() }}</span> }
                <div><h2>{{ brandName }}</h2><p>{{ data.business.category_name || 'Business on BBG' }}</p></div>
              </div>
              <h3>Who we are</h3>
              <p class="business-description">{{ data.storefront.description || data.business.business_description || 'Business details have not been provided yet. Please contact the business for more information.' }}</p>
              @if (data.business.city || data.business.state) {
                <div class="location-note"><span aria-hidden="true">⌖</span><div><strong>Business location</strong><p>{{ data.business.city }}{{ data.business.city && data.business.state ? ', ' : '' }}{{ data.business.state }}{{ data.business.postal_code ? ' ' + data.business.postal_code : '' }}</p></div></div>
              }
            </div>
            <aside class="about-aside">
              <p class="section-label">STOREFRONT DETAILS</p>
              <div class="detail-row"><span>Business category</span><strong>{{ data.business.category_name || 'Not specified' }}</strong></div>
              <div class="detail-row"><span>Product catalogue</span><strong>Publicly browsable</strong></div>
              <div class="detail-row"><span>Prices</span><strong>{{ data.storefront.show_prices ? 'Displayed on products' : 'Available on enquiry' }}</strong></div>
              <div class="detail-row"><span>Online orders</span><strong>{{ data.storefront.accept_online_orders ? 'Available' : 'Contact business' }}</strong></div>
              @if (data.business.business_phone) { <div class="detail-row"><span>Phone</span><strong>{{ data.business.business_phone }}</strong></div> }
              <a class="aside-link" [routerLink]="['/store', data.business.business_slug, 'contact']">Contact {{ brandName }} <span aria-hidden="true">↗</span></a>
            </aside>
          </section>
          <section class="about-cta">
            <div class="cta-inner"><div><p class="section-label">LET'S CONNECT</p><h2>We'd be glad to hear from you.</h2><p>Reach out to the business for product questions and further information.</p></div><a class="cta-button" [routerLink]="['/store', data.business.business_slug, 'contact']">Get in touch <span aria-hidden="true">↗</span></a></div>
          </section>
        }

        @if (section === 'contact') {
          <section class="page-hero contact-hero" aria-labelledby="page-title">
            <div class="hero-inner">
              <p class="eyebrow"><span>WE'RE HERE TO HELP</span><i></i> {{ brandName }}</p>
              <h1 id="page-title">Let's talk<span>.</span></h1>
              <p>Have a question about a product or want to know more? Choose the best way to reach {{ brandName }} below.</p>
            </div>
            <div class="hero-decoration" aria-hidden="true"><span>03</span><i></i><b>CONNECT</b></div>
          </section>

          <section class="contact-content content-wrap">
            <div class="contact-intro">
              <p class="section-label">CONTACT INFORMATION</p>
              <h2>Get in touch with <em>{{ brandName }}</em>.</h2>
              <p>Use the published contact details below to connect with the business directly.</p>
              @if (data.business.business_phone || data.business.business_email || (data.storefront.whatsapp_enabled && data.business.whatsapp_number)) {
                <div class="contact-methods">
                  @if (data.business.business_phone) {
                    <a class="contact-card" [href]="'tel:' + data.business.business_phone"><span class="method-icon" aria-hidden="true">↗</span><span class="method-label">CALL US</span><strong>{{ data.business.business_phone }}</strong><small>Tap to call the business</small></a>
                  }
                  @if (data.business.business_email) {
                    <a class="contact-card" [href]="'mailto:' + data.business.business_email"><span class="method-icon" aria-hidden="true">✉</span><span class="method-label">EMAIL US</span><strong>{{ data.business.business_email }}</strong><small>Send an email enquiry</small></a>
                  }
                  @if (data.storefront.whatsapp_enabled && data.business.whatsapp_number) {
                    <a class="contact-card" [href]="whatsappUrl(data.business.whatsapp_number)" target="_blank" rel="noopener noreferrer"><span class="method-icon" aria-hidden="true">◉</span><span class="method-label">WHATSAPP</span><strong>Message the business</strong><small>Continue the conversation on WhatsApp ↗</small></a>
                  }
                </div>
              } @else {
                <div class="no-contact"><strong>Direct contact details are not published.</strong><p>This business has not made a phone number, email address, or WhatsApp contact available on its storefront.</p></div>
              }
            </div>
            <aside class="address-panel">
              <div class="address-panel-top"><span class="address-icon" aria-hidden="true">⌖</span><p class="section-label">VISIT US</p></div>
              <h2>Business address</h2>
              @if (data.business.address; as address) {
                <address>
                  @if (address.address_line_1) { <span>{{ address.address_line_1 }}</span> }
                  @if (address.address_line_2) { <span>{{ address.address_line_2 }}</span> }
                  @if (address.city) { <span>{{ address.city }}</span> }
                  @if (address.state) { <span>{{ address.state }}</span> }
                  @if (address.postal_code) { <span>{{ address.postal_code }}</span> }
                  @if (address.country_code) { <span>{{ address.country_code }}</span> }
                </address>
                <a class="directions-link" [href]="mapsUrl(data)" target="_blank" rel="noopener noreferrer">Open directions <span aria-hidden="true">↗</span></a>
              } @else {
                <p class="address-unavailable">A public business address has not been provided.</p>
              }
              @if (data.business.city || data.business.state) { <div class="address-location">{{ data.business.city }}{{ data.business.city && data.business.state ? ', ' : '' }}{{ data.business.state }}</div> }
            </aside>
          </section>
          <section class="contact-bottom"><div class="bottom-inner"><div><p class="section-label">EXPLORE MORE</p><h2>Looking for something specific?</h2><p>Browse the published catalogue or learn more about the business.</p></div><div class="bottom-actions"><a [routerLink]="['/store', data.business.business_slug, 'products']">Browse products <span aria-hidden="true">↗</span></a><a [routerLink]="['/store', data.business.business_slug, 'about']">About the business <span aria-hidden="true">↗</span></a></div></div></section>
        }
      </main>
    }
  `,
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
    .hero-decoration{position:absolute;right:max(32px,calc((100vw - 1160px)/2));bottom:46px;display:flex;align-items:center;gap:12px;color:#d1e1d6;font-size:.58rem;font-weight:800;letter-spacing:.15em;writing-mode:vertical-rl}
    .hero-decoration>span{color:var(--accent);font-size:.8rem}
    .hero-decoration>i{width:1px;height:55px;background:#ffffff7a}
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
    .address-panel-top .section-label{margin:0}
    .address-panel h2{margin:22px 0 13px;font-size:1.3rem;letter-spacing:-.04em}
    .address-panel address{display:grid;gap:5px;color:var(--text-secondary);font-size:.85rem;font-style:normal;line-height:1.6}
    .directions-link{display:flex;min-height:43px;align-items:center;justify-content:space-between;margin-top:24px;padding:0 13px;border:1px solid var(--border);border-radius:5px;color:var(--brand-strong);font-size:.77rem;font-weight:800;text-decoration:none}
    .address-unavailable{color:var(--text-secondary);font-size:.8rem;line-height:1.6}
    .address-location{margin-top:20px;padding-top:16px;border-top:1px solid var(--border);color:var(--text-muted);font-size:.74rem}
    .bottom-inner{min-height:220px}
    .bottom-actions{display:flex;flex-direction:column;gap:13px;min-width:205px}
    .bottom-actions a{display:flex;align-items:center;justify-content:space-between;gap:15px;color:var(--brand-strong);font-size:.8rem;font-weight:800;text-decoration:none}
    @media(max-width:1000px){.catalogue-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.catalogue-toolbar{align-items:flex-start;flex-direction:column}.search-form{width:100%}.about-content,.contact-content{gap:38px}.about-content{grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr)}.contact-content{grid-template-columns:minmax(0,1fr) minmax(260px,.75fr)}}
    @media(max-width:700px){.content-wrap,.hero-inner,.cta-inner,.bottom-inner{width:calc(100% - 40px)}.catalogue-tools{width:100%;justify-content:space-between}.sort-control{flex:1}.sort-control select{width:100%;max-width:none}.drawer-filters{grid-template-columns:1fr}.drawer-filters .check-field{grid-column:auto}.page-hero{min-height:300px}.hero-inner{padding:62px 0}.hero-inner h1{font-size:clamp(3rem,13vw,4.6rem)}.hero-decoration{right:18px;bottom:24px}.catalogue{padding-top:48px;padding-bottom:65px}.catalogue-toolbar{align-items:stretch;flex-direction:column}.search-form{width:100%}.catalogue-grid{gap:12px}.product-art{min-height:150px}.art-monogram{font-size:4.5rem}.product-info{padding:12px}.product-info>p{font-size:.7rem}.product-title-row h3{font-size:.85rem}.product-bottom small{display:none}.pagination{gap:10px}.pagination button{min-width:94px}.about-content,.contact-content{grid-template-columns:1fr;gap:35px;padding-top:55px;padding-bottom:62px}.business-identity{margin:20px 0 32px}.about-aside{padding:21px}.cta-inner,.bottom-inner{align-items:flex-start;flex-direction:column;justify-content:center;padding:40px 0}.cta-button{width:100%;justify-content:space-between}.contact-methods{grid-template-columns:1fr 1fr}.address-panel{padding:22px}.bottom-actions{width:100%}}
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
    this.appliedFilters.set(next);
    this.draftFilters = { ...next };
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

  productRoute(product: MarketplaceProduct): string {
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
