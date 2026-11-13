import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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
          @if (searchNotice()) {
            <p class="search-notice" role="status">{{ searchNotice() }}</p>
          }
          <div class="hero-links" aria-label="Quick links">
            <span>Start exploring</span>
            <a href="#categories">Categories</a>
            <i aria-hidden="true"></i>
            <a href="#businesses">Businesses</a>
            <i aria-hidden="true"></i>
            <a href="#promotions">Promotions</a>
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
        <div class="category-empty">
          <div class="category-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 19V8.5L12 4l8 4.5V19M8 19v-5h8v5M8 9h.01M12 9h.01M16 9h.01"></path></svg>
          </div>
          <div>
            <h3>Business categories are coming together</h3>
            <p>Available categories will appear here once the marketplace catalogue is connected.</p>
          </div>
        </div>
      </section>

      <section class="content-section businesses-section" id="businesses" aria-labelledby="businesses-title">
        <div class="section-heading">
          <div>
            <p class="section-kicker">MEET THE COMMUNITY</p>
            <h2 id="businesses-title">Discover businesses</h2>
          </div>
          <span class="section-note">Explore businesses on BBG</span>
        </div>
        <div class="discovery-panel">
          <div class="discovery-illustration" aria-hidden="true">
            <div class="store-building"><span></span><span></span><span></span></div>
            <div class="store-base"></div>
          </div>
          <div class="discovery-copy">
            <h3>Your next business connection starts here.</h3>
            <p>Business profiles and public listings will be displayed here as soon as the discovery service is available.</p>
            <a class="text-link" routerLink="/register">List your business <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>

      <section class="promotion-banner" id="promotions" aria-labelledby="promotions-title">
        <div class="promotion-art" aria-hidden="true">
          <div class="gift-box"><span class="gift-ribbon"></span><span class="gift-bow"></span></div>
          <span class="gift-spark spark-one"></span><span class="gift-spark spark-two"></span>
        </div>
        <div class="promotion-copy">
          <p class="section-kicker">GROW TOGETHER</p>
          <h2 id="promotions-title">Good things are on the way.</h2>
          <p>Discover business promotions and updates as they become available on BBG.</p>
        </div>
        <a class="promotion-action" routerLink="/register">Join BBG <span aria-hidden="true">→</span></a>
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
    .hero { position:relative; isolation:isolate; display:grid; grid-template-columns:minmax(0,1.04fr) minmax(320px,.96fr); min-height:390px; overflow:hidden; color:#fff; background:linear-gradient(112deg,#123f2c 0%,#174d35 57%,#1d6243 100%); border-radius:0 0 22px 22px; }
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
    @media(prefers-reduced-motion:reduce) { *,*::before,*::after { scroll-behavior:auto!important; transition:none!important; } }
  `],
})
export class MarketplaceHome {
  protected readonly searchNotice = signal('');

  protected submitSearch(event: Event): void {
    event.preventDefault();
    this.searchNotice.set('Marketplace search will be enabled when the public search API contract is finalized.');
  }
}
