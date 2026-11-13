import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketplaceApiService, MarketplaceBusiness, MarketplaceCategory, MarketplaceProduct, MarketplacePromotion, MarketplaceHomeStats } from '../../../core/marketplace/marketplace-api.service';

@Component({
  selector: 'app-marketplace-home',
  imports: [RouterLink],
  template: `
    <main class="marketplace-home">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">BUSINESS MANAGEMENT &amp; MARKETPLACE PLATFORM</p>
          <h1 id="hero-title">Discover businesses.<br /><span>Find opportunities.</span></h1>
          <p class="hero-description">Explore products and connect with businesses on BBG.</p>

          <form class="marketplace-search" role="search" (submit)="submitSearch($event)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.5 4.5"></path></svg>
            <label class="sr-only" for="marketplace-query">Search businesses or products</label>
            <input id="marketplace-query" name="query" type="search" placeholder="Search businesses or products..." autocomplete="off" />
            <button type="submit" aria-label="Search marketplace">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12h14M12.5 5.5 19 12l-6.5 6.5"></path></svg>
            </button>
          </form>
          <div class="hero-links" aria-label="Quick links">
            <span>Start exploring</span>
            <a href="#categories">Categories</a>
            <i aria-hidden="true"></i>
            <a href="#businesses">Businesses</a>
            <i aria-hidden="true"></i>
            <a href="#promotions">Promotions</a>
          </div>
          <div class="hero-stats" aria-label="Live BBG marketplace statistics">
            @if (homeStats(); as stats) {
              <div class="hero-stat"><strong>{{ formatCount(stats.businesses_registered) }}</strong><span>Businesses registered</span></div>
              <div class="hero-stat"><strong>{{ formatCount(stats.platform_users) }}</strong><span>Platform users</span></div>
              <div class="hero-stat"><strong>{{ formatCount(stats.products_listed) }}</strong><span>Products listed</span></div>
              <div class="hero-stat"><strong>{{ formatCount(stats.orders_completed) }}</strong><span>Orders completed</span></div>
            } @else {
              @for (label of statLabels; track label) {
                <div class="hero-stat hero-stat-loading"><strong>—</strong><span>{{ label }}</span></div>
              }
            }
          </div>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="visual-glow"></div>
          <div class="visual-sun"></div>
          <div class="city city-back">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="city city-front">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="visual-ground"></div>
          <div class="visual-leaf leaf-one"></div>
          <div class="visual-leaf leaf-two"></div>
        </div>
        <div class="hero-stripe stripe-one" aria-hidden="true"></div>
        <div class="hero-stripe stripe-two" aria-hidden="true"></div>
      </section>

      <section class="content-section categories-section" id="categories" aria-labelledby="categories-title">
        <div class="section-heading">
          <div>
            <p class="section-kicker">FIND YOUR SPACE</p>
            <h2 id="categories-title">Explore categories</h2>
          </div>
          <span class="section-note">Browse the BBG marketplace</span>
        </div>
        @if (loading()) {
          <p class="state-message" role="status">Loading marketplace categories…</p>
        } @else if (loadError()) {
          <p class="state-message state-error" role="alert">{{ loadError() }}</p>
        } @else if (categories().length) {
          <div class="category-grid">
            @for (category of categories(); track category.id) {
              <article class="category-card">
                <span class="category-mark" aria-hidden="true">{{ category.category_name.slice(0, 1).toUpperCase() }}</span>
                <span class="category-name">{{ category.category_name }}</span>
                @if (category.description) { <span class="category-description">{{ category.description }}</span> }
              </article>
            }
          </div>
        } @else {
          <div class="category-empty">
            <div class="category-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 19V8.5L12 4l8 4.5V19M8 19v-5h8v5M8 9h.01M12 9h.01M16 9h.01"></path></svg>
            </div>
            <div><h3>No public categories yet</h3><p>Business categories published on BBG will appear here.</p></div>
          </div>
        }
      </section>

      <section class="content-section businesses-section" id="businesses" aria-labelledby="businesses-title">
        <div class="section-heading">
          <div>
            <p class="section-kicker">MEET THE COMMUNITY</p>
            <h2 id="businesses-title">{{ businessesHeading() }}</h2>
          </div>
          <span class="section-note">{{ businessesNote() }}</span>
        </div>
        @if (searchLoading()) {
          <p class="state-message" role="status">Searching published businesses…</p>
        } @else if (searchError()) {
          <p class="state-message state-error" role="alert">{{ searchError() }}</p>
        } @else if (businesses().length) {
          <div class="business-grid">
            @for (business of businesses(); track business.id) {
              <article class="business-card">
                <div class="business-card-top">
                  <span class="business-avatar" aria-hidden="true">{{ business.business_name.slice(0, 1).toUpperCase() }}</span>
                  @if (!searchActive() && business.rank) { <span class="business-rank">#{{ business.rank }}</span> }
                  @if (business.category_name) { <span class="business-category">{{ business.category_name }}</span> }
                </div>
                <h3>{{ business.business_name }}</h3>
                <p class="business-location">{{ locationLabel(business) }}</p>
                @if (business.business_description) {
                  <p class="business-description">{{ business.business_description }}</p>
                }
                @if (!searchActive() && business.popularity) {
                  <div class="business-metrics" aria-label="Business engagement">
                    <span>{{ business.popularity.views }} views</span>
                    <span>{{ business.popularity.enquiries }} enquiries</span>
                  </div>
                }
                <div class="business-card-footer">
                  @if (business.accept_online_orders) { <span>Online orders</span> }
                  @if (business.whatsapp_enabled) { <span>WhatsApp</span> }
                </div>
                <a class="card-action" [routerLink]="['/businesses', business.business_slug]">Explore business <span aria-hidden="true">→</span></a>
              </article>
            }
          </div>
        } @else {
          <div class="category-empty">
            <div class="category-empty-icon" aria-hidden="true">⌕</div>
            <div><h3>No published businesses found</h3><p>Try another search, or check back as more businesses publish their storefronts.</p></div>
          </div>
        }
      </section>

      <section class="content-section" id="recent-businesses" aria-labelledby="recent-businesses-title">
        <div class="section-heading">
          <div>
            <p class="section-kicker">NEW TO THE MARKETPLACE</p>
            <h2 id="recent-businesses-title">Recently published businesses</h2>
          </div>
          <span class="section-note">Newest published storefronts</span>
        </div>
        @if (loading()) {
          <p class="state-message" role="status">Loading recently published businesses…</p>
        } @else if (recentBusinesses().length) {
          <div class="business-grid">
            @for (business of recentBusinesses(); track business.id) {
              <article class="business-card">
                <div class="business-card-top">
                  <span class="business-avatar" aria-hidden="true">{{ business.business_name.slice(0, 1).toUpperCase() }}</span>
                  @if (business.category_name) { <span class="business-category">{{ business.category_name }}</span> }
                </div>
                <h3>{{ business.business_name }}</h3>
                <p class="business-location">{{ locationLabel(business) }}</p>
                @if (business.business_description) {
                  <p class="business-description">{{ business.business_description }}</p>
                }
                @if (business.created_on) {
                  <time class="item-date" [attr.datetime]="business.created_on">Added {{ formatDate(business.created_on) }}</time>
                }
                <a class="card-action" [routerLink]="['/businesses', business.business_slug]">Explore business <span aria-hidden="true">→</span></a>
              </article>
            }
          </div>
          <p class="data-note">Only approved, published storefronts are shown. Ordering currently uses profile creation time because the business schema does not yet store a separate publication timestamp.</p>
        } @else {
          <p class="state-message">No recently published businesses are available yet.</p>
        }
      </section>

      <section class="content-section" id="recent-products" aria-labelledby="recent-products-title">
        <div class="section-heading">
          <div>
            <p class="section-kicker">FRESH FINDS</p>
            <h2 id="recent-products-title">Recently published products</h2>
          </div>
          <span class="section-note">Products from published BBG storefronts</span>
        </div>
        @if (loading()) {
          <p class="state-message" role="status">Loading recently published products…</p>
        } @else if (recentProducts().length) {
          <div class="product-grid">
            @for (product of recentProducts(); track product.id) {
              <article class="product-card">
                <div class="product-card-mark" aria-hidden="true">BBG</div>
                @if (product.category_name) { <span class="business-category">{{ product.category_name }}</span> }
                <h3>{{ product.product_name }}</h3>
                @if (product.brand_name) { <p class="product-brand">{{ product.brand_name }}</p> }
                @if (product.description) { <p class="product-description">{{ product.description }}</p> }
                @if (product.selling_price !== undefined) {
                  <p class="product-price">{{ formatPrice(product.selling_price) }} <span>/ {{ product.unit.symbol }}</span></p>
                } @else {
                  <p class="product-price product-price-hidden">Contact business for price</p>
                }
                <p class="product-business">From {{ product.business.business_name }}</p>
                <time class="item-date" [attr.datetime]="product.created_on">Added {{ formatDate(product.created_on) }}</time>
                <a class="card-action" [routerLink]="['/products', product.id]">View product <span aria-hidden="true">→</span></a>
              </article>
            }
          </div>
          <p class="data-note">Only active products from approved, published storefronts are shown. Ordering currently uses product creation time because the product schema does not yet store a separate publication timestamp.</p>
        } @else {
          <p class="state-message">No recently published products are available yet.</p>
        }
      </section>

      <section class="promotion-banner" id="promotions" aria-labelledby="promotions-title">
        <div class="promotion-copy">
          <p class="section-kicker">GROW TOGETHER</p>
          <h2 id="promotions-title">Latest business promotions</h2>
          <p>Current public promotions published by businesses on BBG.</p>
        </div>
        @if (loading()) {
          <p class="promotion-state" role="status">Loading promotions…</p>
        } @else if (promotions().length) {
          <div class="promotion-grid">
            @for (promotion of promotions(); track promotion.id) {
              <article class="promotion-card">
                <span class="promotion-business">{{ promotion.business_name }}</span>
                <h3>{{ promotion.post_title }}</h3>
                <p>{{ promotion.post_content }}</p>
                <time [attr.datetime]="promotion.published_on">{{ formatDate(promotion.published_on) }}</time>
              </article>
            }
          </div>
        } @else {
          <p class="promotion-state">There are no active public promotions right now.</p>
        }
      </section>

      <section class="entrepreneur-callout" aria-labelledby="entrepreneur-title">
        <div>
          <p class="section-kicker">BUILT FOR BUSINESS</p>
          <h2 id="entrepreneur-title">Have a business to grow?</h2>
          <p>Create your business presence and connect with the BBG community.</p>
        </div>
        <a routerLink="/register">Get started <span aria-hidden="true">→</span></a>
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; }
    .marketplace-home { padding-bottom: 24px; }
    .hero { position:relative; isolation:isolate; display:grid; grid-template-columns:minmax(0,1.04fr) minmax(320px,.96fr); min-height:500px; overflow:hidden; color:#fff; background:radial-gradient(ellipse at 18% 0%,rgba(91,160,112,.38),transparent 42%),linear-gradient(112deg,#0d3425 0%,#174d35 57%,#1d6243 100%); border-radius:0 0 28px 28px; box-shadow:0 22px 55px rgba(17,64,43,.12); }
    .hero-copy { position:relative; z-index:3; align-self:center; width:min(100%,720px); padding:52px 0 48px max(36px,calc((100vw - 1400px)/2)); padding-left:max(36px,calc((100vw - 1400px)/2)); }
    .eyebrow,.section-kicker { margin:0 0 15px; color:#c5d9ce; font-size:.68rem; font-weight:750; letter-spacing:.15em; }
    h1 { margin:0; font-size:clamp(2.7rem,5vw,4.6rem); font-weight:760; letter-spacing:-.065em; line-height:1.02; }
    h1 span { color:#f5d928; }
    .hero-description { margin:20px 0 22px; color:rgba(255,255,255,.86); font-size:1.05rem; line-height:1.6; }
    .marketplace-search { display:flex; align-items:center; gap:13px; width:min(100%,650px); min-height:58px; padding:6px 7px 6px 18px; background:#fff; border:1px solid rgba(255,255,255,.55); border-radius:999px; box-shadow:0 12px 35px rgba(5,28,18,.18); }
    .marketplace-search > svg { flex:0 0 22px; width:22px; fill:none; stroke:#17221b; stroke-width:1.8; }
    .marketplace-search input { width:100%; min-width:0; color:#17221b; background:transparent; border:0; outline:0; font:inherit; font-size:.92rem; }
    .marketplace-search input::placeholder { color:#68736c; opacity:1; }
    .marketplace-search button { display:grid; flex:0 0 44px; width:44px; height:44px; place-items:center; color:#171d19; background:#f5d928; border:0; border-radius:50%; cursor:pointer; transition:transform .18s ease,background .18s ease; }
    .marketplace-search button:hover { background:#ffe95b; transform:translateX(2px); }
    .marketplace-search button svg { width:22px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .search-notice { margin:10px 0 0; color:#fff; font-size:.78rem; }
    .hero-links { display:flex; align-items:center; flex-wrap:wrap; gap:11px; margin-top:14px; color:rgba(255,255,255,.82); font-size:.76rem; }
    .hero-links span { font-weight:700; color:#fff; }
    .hero-links a { color:inherit; text-decoration:none; }
    .hero-links a:hover { color:#f5d928; }
    .hero-links i { width:4px; height:4px; background:#f5d928; border-radius:50%; }
    .hero-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; width:min(100%,720px); margin-top:25px; }
    .hero-stat { display:flex; min-height:78px; flex-direction:column; justify-content:center; gap:5px; padding:11px 12px; background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.19); border-radius:12px; box-shadow:inset 0 1px rgba(255,255,255,.08); backdrop-filter:blur(8px); }
    .hero-stat strong { color:#fff; font-size:clamp(1.2rem,2.1vw,1.8rem); font-weight:850; letter-spacing:-.045em; line-height:1; font-variant-numeric:tabular-nums; }
    .hero-stat span { color:rgba(255,255,255,.78); font-size:.65rem; font-weight:650; line-height:1.3; }
    .hero-stat-loading strong { color:rgba(255,255,255,.55); }
    .hero-visual { position:relative; min-height:390px; overflow:hidden; background:linear-gradient(145deg,#b8d8d0 0%,#dbe8d8 48%,#f1e9c8 100%); clip-path:polygon(18% 0,100% 0,100% 100%,0 100%); }
    .visual-glow { position:absolute; top:13%; right:12%; width:220px; height:220px; background:rgba(245,217,40,.38); border-radius:50%; filter:blur(2px); }
    .visual-sun { position:absolute; top:18%; right:22%; width:88px; height:88px; background:#f5d928; border-radius:50%; box-shadow:0 0 55px rgba(245,217,40,.55); }
    .city { position:absolute; bottom:15%; display:flex; align-items:flex-end; gap:9px; }
    .city span { display:block; width:55px; border:2px solid rgba(255,255,255,.48); background:linear-gradient(145deg,#6f9e91,#315d4c); box-shadow:inset 0 0 0 7px rgba(255,255,255,.07); }
    .city span::after { content:""; display:block; width:100%; height:100%; background:repeating-linear-gradient(0deg,transparent 0 18px,rgba(255,255,255,.28) 19px 21px),repeating-linear-gradient(90deg,transparent 0 17px,rgba(255,255,255,.25) 18px 20px); }
    .city-back { right:4%; height:64%; opacity:.7; }
    .city-back span:nth-child(1) { height:66%; width:49px; }.city-back span:nth-child(2) { height:100%; width:67px; }.city-back span:nth-child(3) { height:77%; width:58px; }.city-back span:nth-child(4) { height:53%; width:45px; }
    .city-front { right:16%; height:46%; z-index:2; }.city-front span { background:linear-gradient(145deg,#41765f,#174d35); }.city-front span:nth-child(1) { height:65%; }.city-front span:nth-child(2) { height:100%; width:62px; }.city-front span:nth-child(3) { height:77%; }.city-front span:nth-child(4) { height:54%; }.city-front span:nth-child(5) { height:83%; }
    .visual-ground { position:absolute; right:-10%; bottom:0; left:-5%; height:18%; background:linear-gradient(90deg,#789b67,#315f43); transform:skewY(-5deg); }
    .visual-leaf { position:absolute; z-index:3; bottom:10%; left:10%; width:100px; height:34px; background:#477b4b; border-radius:100% 0 100% 0; transform:rotate(-25deg); opacity:.9; }
    .leaf-two { bottom:18%; left:17%; width:65px; height:25px; transform:rotate(25deg) scaleX(-1); background:#739c4c; }
    .hero-stripe { position:absolute; z-index:2; top:-15%; bottom:-15%; width:62px; background:rgba(245,217,40,.32); transform:skewX(-31deg); pointer-events:none; }
    .stripe-one { left:61%; }.stripe-two { left:67%; width:24px; background:rgba(245,217,40,.55); }
    .content-section { width:min(1400px,calc(100% - 64px)); margin:0 auto; padding-top:38px; scroll-margin-top:90px; }
    .section-heading { display:flex; align-items:end; justify-content:space-between; gap:20px; margin-bottom:17px; }
    .section-heading .section-kicker,.promotion-copy .section-kicker,.entrepreneur-callout .section-kicker { margin-bottom:7px; color:#648071; }
    .section-heading h2,.promotion-copy h2,.entrepreneur-callout h2 { margin:0; color:var(--text-primary); font-size:1.5rem; font-weight:740; letter-spacing:-.045em; }
    .section-note { color:var(--text-secondary); font-size:.8rem; }
    .category-empty { display:flex; align-items:center; gap:17px; min-height:104px; padding:20px 24px; background:var(--surface-subtle); border:1px solid var(--border); border-radius:14px; }
    .category-empty-icon { display:grid; flex:0 0 48px; width:48px; height:48px; place-items:center; color:#174d35; background:#e8f1eb; border-radius:13px; }
    .category-empty-icon svg { width:25px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
    .category-empty h3,.discovery-copy h3 { margin:0 0 5px; color:var(--text-primary); font-size:.98rem; }
    .category-empty p,.discovery-copy p { margin:0; color:var(--text-secondary); font-size:.83rem; line-height:1.6; }
    .discovery-panel { display:grid; grid-template-columns:260px 1fr; align-items:center; min-height:205px; overflow:hidden; background:var(--surface-card); border:1px solid var(--border); border-radius:16px; }
    .discovery-illustration { position:relative; display:grid; height:100%; min-height:205px; place-items:center; overflow:hidden; background:linear-gradient(140deg,#e7efe8,#f5f5f5); }
    .store-building { position:relative; z-index:2; display:flex; align-items:flex-end; gap:6px; width:142px; height:115px; padding:12px; background:#174d35; border-radius:7px 7px 0 0; box-shadow:0 15px 30px rgba(23,77,53,.16); }
    .store-building::before { content:""; position:absolute; top:-17px; right:-7px; left:-7px; height:18px; background:#f5d928; border-radius:5px 5px 0 0; }
    .store-building span { flex:1; height:53px; background:linear-gradient(145deg,#d5e6d9,#fff); border:3px solid #c4d8ca; border-radius:3px; }
    .store-building span:nth-child(2) { height:72px; }.store-building span:nth-child(3) { height:62px; }
    .store-base { position:absolute; bottom:25px; width:190px; height:8px; background:#b4c9b9; border-radius:50%; filter:blur(2px); }
    .discovery-copy { padding:30px 38px; }.discovery-copy h3 { font-size:1.1rem; }.discovery-copy p { max-width:600px; margin-bottom:15px; }
    .text-link { color:#174d35; font-size:.82rem; font-weight:750; text-decoration:none; }.text-link span { margin-left:5px; }
    .promotion-banner { position:relative; display:flex; align-items:center; gap:25px; width:min(1400px,calc(100% - 64px)); min-height:142px; margin:30px auto 0; overflow:hidden; padding:22px 34px; color:#fff; background:linear-gradient(105deg,#123f2c,#174d35 70%,#236442); border-radius:16px; scroll-margin-top:90px; }
    .promotion-banner::after { content:""; position:absolute; top:-40%; right:28%; width:150px; height:180%; background:rgba(245,217,40,.18); transform:skewX(-35deg); }
    .promotion-art { position:relative; z-index:1; flex:0 0 150px; height:95px; }
    .gift-box { position:absolute; bottom:0; left:28px; width:80px; height:62px; background:#f5d928; border-radius:5px; box-shadow:inset -12px 0 rgba(185,146,0,.15); }
    .gift-box::before { content:""; position:absolute; top:-12px; left:-7px; width:94px; height:15px; background:#ffea63; border-radius:4px; }
    .gift-ribbon { position:absolute; top:-12px; left:33px; width:14px; height:74px; background:#174d35; }
    .gift-bow::before,.gift-bow::after { content:""; position:absolute; top:-29px; left:22px; width:30px; height:23px; border:7px solid #f5d928; border-radius:100% 100% 0 100%; transform:rotate(24deg); }
    .gift-bow::after { left:44px; transform:scaleX(-1) rotate(24deg); }
    .gift-spark { position:absolute; width:8px; height:8px; background:#f5d928; transform:rotate(45deg); }.spark-one { top:5px; left:15px; }.spark-two { top:20px; right:8px; width:5px; height:5px; }
    .promotion-copy { position:relative; z-index:1; flex:1; }.promotion-copy .section-kicker { color:#c5d9ce; }.promotion-copy h2 { color:#f5d928; font-size:1.45rem; }.promotion-copy p { margin:7px 0 0; color:rgba(255,255,255,.83); font-size:.84rem; }
    .promotion-action { position:relative; z-index:2; display:inline-flex; align-items:center; gap:15px; padding:13px 20px; color:#171d19; background:#f5d928; border-radius:999px; font-size:.82rem; font-weight:750; text-decoration:none; white-space:nowrap; transition:background .18s ease,transform .18s ease; }.promotion-action:hover { background:#ffeb5c; transform:translateY(-1px); }
    .entrepreneur-callout { display:flex; align-items:center; justify-content:space-between; gap:20px; width:min(1400px,calc(100% - 64px)); margin:28px auto 0; padding:26px 30px; background:var(--surface-subtle); border:1px solid var(--border); border-radius:15px; }
    .entrepreneur-callout h2 { font-size:1.2rem; }.entrepreneur-callout p:not(.section-kicker) { margin:6px 0 0; color:var(--text-secondary); font-size:.83rem; }
    .entrepreneur-callout > a { display:inline-flex; align-items:center; gap:12px; padding:12px 18px; color:#fff; background:#174d35; border-radius:9px; font-size:.82rem; font-weight:700; text-decoration:none; white-space:nowrap; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    @media(max-width:900px) { .hero { grid-template-columns:1fr .55fr; }.hero-copy { padding-left:32px; }.hero-visual { min-height:360px; }.hero-stripe { display:none; }.city-back { right:-30%; }.city-front { right:-5%; } }
    @media(max-width:680px) {
      .hero { display:block; min-height:430px; border-radius:0 0 17px 17px; }.hero-copy { padding:46px 22px 34px; }.hero h1 { font-size:clamp(2.5rem,11vw,3.6rem); }.hero-description { max-width:430px; font-size:.94rem; }.hero-visual { position:absolute; right:-75px; bottom:0; width:60%; min-height:190px; height:48%; clip-path:none; opacity:.3; }.visual-sun { width:58px; height:58px; }.city { bottom:12%; }.city-back { right:-20%; }.city-front { right:10%; }.hero-links { gap:8px; font-size:.72rem; }
      .content-section,.promotion-banner,.entrepreneur-callout { width:calc(100% - 32px); }.content-section { padding-top:29px; }.section-heading { align-items:flex-start; flex-direction:column; gap:6px; }.section-heading h2 { font-size:1.3rem; }.category-empty { align-items:flex-start; padding:18px; }.category-empty-icon { flex-basis:42px; width:42px; height:42px; }.discovery-panel { grid-template-columns:1fr; }.discovery-illustration { min-height:145px; }.discovery-copy { padding:22px; }
      .promotion-banner { flex-wrap:wrap; gap:12px; padding:20px; }.promotion-art { flex-basis:92px; width:92px; height:75px; }.gift-box { left:5px; transform:scale(.8); transform-origin:bottom left; }.promotion-copy { min-width:calc(100% - 110px); }.promotion-copy h2 { font-size:1.2rem; }.promotion-action { margin-left:auto; }.entrepreneur-callout { align-items:flex-start; flex-direction:column; padding:22px; }
    }
    .state-message { margin:0; padding:20px 22px; color:var(--text-secondary); background:var(--surface-subtle); border:1px solid var(--border); border-radius:13px; font-size:.88rem; }
    .state-error { color:#9d3028; background:#fff5f3; border-color:#f1cbc5; }
    .category-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:13px; }
    .category-card { display:flex; min-height:118px; flex-direction:column; align-items:flex-start; gap:10px; padding:17px; background:var(--surface-card); border:1px solid var(--border); border-radius:14px; }
    .category-mark,.business-avatar { display:grid; width:38px; height:38px; place-items:center; color:#174d35; background:#e8f1eb; border-radius:11px; font-weight:800; }
    .category-name { color:var(--text-primary); font-size:.9rem; font-weight:750; }
    .category-description { color:var(--text-secondary); font-size:.75rem; line-height:1.45; }
    .business-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(245px,1fr)); gap:15px; }
    .business-card { min-width:0; padding:20px; background:var(--surface-card); border:1px solid var(--border); border-radius:15px; }
    .business-card-top { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; }
    .business-avatar { width:46px; height:46px; border-radius:13px; font-size:1.1rem; }
    .business-category { padding:6px 9px; color:#315d47; background:#eaf2ec; border-radius:999px; font-size:.68rem; font-weight:700; }
    .business-rank { display:grid; width:28px; height:28px; place-items:center; color:#171d19; background:#f5d928; border-radius:8px; font-size:.72rem; font-weight:850; }
    .business-card h3 { margin:0 0 5px; color:var(--text-primary); font-size:1rem; }
    .business-location { margin:0; color:var(--text-secondary); font-size:.76rem; }
    .business-description { display:-webkit-box; min-height:3.9em; margin:12px 0; overflow:hidden; color:var(--text-secondary); font-size:.8rem; line-height:1.5; -webkit-line-clamp:3; -webkit-box-orient:vertical; }
    .business-card-footer { display:flex; flex-wrap:wrap; gap:7px; margin-top:13px; }
    .business-card-footer span { padding:5px 8px; color:#315d47; background:#edf4ef; border-radius:6px; font-size:.68rem; font-weight:700; }
    .business-metrics { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
    .business-metrics span { padding:5px 8px; color:var(--text-secondary); background:var(--surface-subtle); border:1px solid var(--border); border-radius:6px; font-size:.68rem; font-weight:700; }
    .product-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:15px; }
    .product-card { min-width:0; padding:19px; background:var(--surface-card); border:1px solid var(--border); border-radius:15px; }
    .product-card-mark { display:grid; width:44px; height:44px; margin-bottom:14px; place-items:center; color:#174d35; background:#e8f1eb; border-radius:12px; font-size:.7rem; font-weight:850; letter-spacing:.06em; }
    .product-card h3 { margin:12px 0 5px; color:var(--text-primary); font-size:1rem; }
    .product-brand,.product-business,.item-date { color:var(--text-secondary); font-size:.72rem; }
    .product-brand { margin:0 0 8px; }
    .product-description { display:-webkit-box; min-height:3.3em; margin:9px 0; overflow:hidden; color:var(--text-secondary); font-size:.78rem; line-height:1.5; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
    .product-price { margin:13px 0 7px; color:var(--text-primary); font-size:1.05rem; font-weight:800; }
    .product-price span { color:var(--text-secondary); font-size:.75rem; font-weight:500; }
    .product-price-hidden { font-size:.82rem; font-weight:650; }
    .product-business { margin:8px 0 4px; }
    .item-date { display:block; margin-top:10px; }
    .card-action { display:inline-flex; align-items:center; justify-content:space-between; gap:12px; width:100%; margin-top:15px; padding:10px 12px; color:#174d35; background:#edf4ef; border:1px solid #d8e7dc; border-radius:9px; font-size:.78rem; font-weight:750; text-decoration:none; transition:background .18s ease,transform .18s ease; }
    .card-action:hover { background:#e1eee5; transform:translateY(-1px); }
    .card-action span { font-size:1rem; }
    .data-note { margin:12px 0 0; color:var(--text-secondary); font-size:.72rem; line-height:1.5; }
    .promotion-banner { align-items:flex-start; flex-direction:column; }
    .promotion-copy { width:100%; }
    .promotion-grid { position:relative; z-index:1; display:grid; width:100%; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .promotion-card { padding:16px; color:#fff; background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.2); border-radius:12px; }
    .promotion-business { color:#f5d928; font-size:.7rem; font-weight:750; }
    .promotion-card h3 { margin:7px 0; color:#fff; font-size:.96rem; }
    .promotion-card p { display:-webkit-box; margin:0 0 10px; overflow:hidden; color:rgba(255,255,255,.82); font-size:.78rem; line-height:1.5; -webkit-line-clamp:3; -webkit-box-orient:vertical; }
    .promotion-card time,.promotion-state { color:rgba(255,255,255,.76); font-size:.72rem; }
    .promotion-state { margin:0; }
    @media(max-width:900px) { .hero { grid-template-columns:minmax(0,1fr) minmax(260px,.72fr); } .hero-stats { grid-template-columns:repeat(2,minmax(0,1fr)); max-width:430px; } }
    @media(max-width:650px) { .hero { grid-template-columns:1fr; min-height:0; } .hero-copy { padding:48px 22px 32px; } .hero-visual { min-height:220px; clip-path:none; } .hero-stripe { display:none; } .hero-stats { max-width:none; } .hero-stat { min-height:70px; } }
    @media(prefers-reduced-motion:reduce) { *,*::before,*::after { scroll-behavior:auto!important; transition:none!important; } }
  `],
})
export class MarketplaceHome implements OnInit {
  private readonly marketplaceApi = inject(MarketplaceApiService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly searchLoading = signal(false);
  protected readonly searchError = signal('');
  protected readonly searchActive = signal(false);
  protected readonly categories = signal<MarketplaceCategory[]>([]);
  protected readonly businesses = signal<MarketplaceBusiness[]>([]);
  protected readonly recentBusinesses = signal<MarketplaceBusiness[]>([]);
  protected readonly recentProducts = signal<MarketplaceProduct[]>([]);
  protected readonly promotions = signal<MarketplacePromotion[]>([]);
  protected readonly homeStats = signal<MarketplaceHomeStats | null>(null);
  protected readonly statLabels = ['Businesses registered', 'Platform users', 'Products listed', 'Orders completed'];

  ngOnInit(): void {
    this.loadHome();
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const query = String(formData.get('query') ?? '').trim();

    if (!query) {
      this.loadHome();
      return;
    }

    this.searchLoading.set(true);
    this.searchError.set('');
    this.searchActive.set(true);
    this.marketplaceApi.listBusinesses(query).subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.searchError.set(response.msgArr?.join(' ') || 'Unable to search businesses right now.');
          this.businesses.set([]);
        } else {
          this.businesses.set(response.data.items ?? []);
        }
        this.searchLoading.set(false);
      },
      error: () => {
        this.searchError.set('We could not reach the marketplace. Please try again.');
        this.searchLoading.set(false);
      },
    });
  }

  protected businessesHeading(): string {
    return this.searchActive() ? 'Business search results' : 'Most popular businesses';
  }

  protected businessesNote(): string {
    return this.searchActive() ? 'Matching published storefronts' : 'Ranked using recorded profile views and enquiries';
  }

  protected formatCount(value: number): string {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
  }

  protected formatPrice(value: number | string): string {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
      : String(value);
  }

  protected locationLabel(business: MarketplaceBusiness): string {
    return [business.city, business.state].filter(Boolean).join(', ') || 'Location not provided';
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  private loadHome(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.searchError.set('');
    this.searchActive.set(false);
    this.marketplaceApi.getHomeSummary().subscribe({
      next: (response) => {
        if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
          this.loadError.set(response.msgArr?.join(' ') || 'Marketplace data is currently unavailable.');
          this.homeStats.set(null);
          this.categories.set([]);
          this.businesses.set([]);
          this.recentBusinesses.set([]);
          this.recentProducts.set([]);
          this.promotions.set([]);
        } else {
          this.homeStats.set(response.data.stats ?? null);
          this.categories.set(response.data.categories ?? []);
          this.businesses.set(response.data.popular_businesses ?? []);
          this.recentBusinesses.set(response.data.recent_businesses ?? []);
          this.recentProducts.set(response.data.recent_products ?? []);
          this.promotions.set(response.data.promotions ?? []);
        }
        this.loading.set(false);
        this.searchLoading.set(false);
      },
      error: () => {
        this.loadError.set('We could not load marketplace data. Please refresh the page to try again.');
        this.loading.set(false);
      },
    });
  }
}
