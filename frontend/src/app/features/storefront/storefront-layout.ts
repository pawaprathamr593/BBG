import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

interface StorefrontNavItem {
  label: string;
  commands: Array<string>;
  exact?: boolean;
}

@Component({
  selector: 'app-storefront-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  providers: [StorefrontContextService],
  template: `<div class="store-shell">
      @if (context.loading()) {
        <div class="state" role="status">Loading storefront…</div>
      } @else if (context.error()) {
        <main class="state error" role="alert">
          <h1>Storefront unavailable</h1>
          <p>{{ context.error() }}</p>
          <a routerLink="/businesses">Browse businesses</a>
        </main>
      } @else if (context.detail(); as data) {
        <div class="store-announcement">
          <span class="announcement-dot" aria-hidden="true"></span>
          <span>Welcome to the official {{ brandName }} store</span>
        </div>
        <header class="store-header">
          <div class="header-inner">
            <a class="brand" [routerLink]="['/store', slug]" aria-label="Visit {{ brandName }} home" (click)="closeMenu()">
              @if (data.business.logo_path) {
                <img [src]="data.business.logo_path" [alt]="brandName + ' logo'" />
              } @else {
                <span class="brand-mark" aria-hidden="true">{{ brandName.slice(0, 1).toUpperCase() }}</span>
              }
              <span class="brand-copy">
                <span class="brand-name">{{ brandName }}</span>
                <span class="brand-caption">OFFICIAL STOREFRONT</span>
              </span>
            </a>
            <button class="store-menu-toggle" type="button"
              [attr.aria-expanded]="menuOpen" aria-controls="storefront-navigation"
              aria-label="Toggle storefront navigation" (click)="toggleMenu()">
              <span></span><span></span><span></span>
            </button>
            <nav id="storefront-navigation" class="store-nav" [class.is-open]="menuOpen"
              aria-label="Storefront navigation">
              @for (item of navItems; track item.label) {
                <a [routerLink]="item.commands" [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                  routerLinkActive="active" (click)="closeMenu()">{{ item.label }}</a>
              }
            </nav>
            <a class="account" [routerLink]="['/store', slug, 'login']" [queryParams]="{ returnUrl: currentUrl }">
              <span class="account-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
              </span>
              <span>{{ auth.isAuthenticated() ? 'My account' : 'Sign in' }}</span>
            </a>
          </div>
        </header>
        <main id="storefront-content"><router-outlet /></main>
        <footer class="store-footer">
          <div class="footer-main">
            <div class="footer-brand-block">
              <a class="footer-brand" [routerLink]="['/store', slug]">
                @if (data.business.logo_path) {
                  <img [src]="data.business.logo_path" [alt]="brandName + ' logo'" />
                } @else {
                  <span class="footer-brand-mark" aria-hidden="true">{{ brandName.slice(0, 1).toUpperCase() }}</span>
                }
                <span>{{ brandName }}</span>
              </a>
              <p>{{ data.storefront.description || data.business.business_description || 'Discover products and connect directly with our business.' }}</p>
              @if (data.business.address; as address) {
                <address>
                  @if (address.address_line_1) { <span>{{ address.address_line_1 }}</span> }
                  @if (address.address_line_2) { <span>{{ address.address_line_2 }}</span> }
                  <span>{{ address.city }}{{ address.city && address.state ? ', ' : '' }}{{ address.state }}{{ address.postal_code ? ' ' + address.postal_code : '' }}</span>
                  @if (address.country_code) { <span>{{ address.country_code }}</span> }
                </address>
              }
            </div>
            <div class="footer-column">
              <h2>Explore</h2>
              @for (item of navItems; track item.label) {
                <a [routerLink]="item.commands">{{ item.label }}</a>
              }
            </div>
            @if (data.business.business_phone || data.business.business_email || (data.storefront.whatsapp_enabled && data.business.whatsapp_number)) {
              <div class="footer-column footer-contact">
                <h2>Get in touch</h2>
                @if (data.business.business_phone) {
                  <a class="contact-link" [href]="'tel:' + data.business.business_phone"><span class="contact-icon" aria-hidden="true">☎</span><span>{{ data.business.business_phone }}</span></a>
                }
                @if (data.business.business_email) {
                  <a class="contact-link" [href]="'mailto:' + data.business.business_email"><span class="contact-icon" aria-hidden="true">✉</span><span>{{ data.business.business_email }}</span></a>
                }
                @if (data.storefront.whatsapp_enabled && data.business.whatsapp_number) {
                  <a class="contact-link" [href]="'https://wa.me/' + data.business.whatsapp_number.replace('+', '')"
                    target="_blank" rel="noopener noreferrer"><span class="contact-icon" aria-hidden="true">◉</span><span>Chat on WhatsApp</span></a>
                }
              </div>
            }
          </div>
          <div class="footer-bottom">
            <span>© {{ year }} {{ data.business.business_name }}. All rights reserved.</span>
            <span class="footer-powered">Storefront powered by <strong>BBG</strong></span>
          </div>
        </footer>
      }
    </div>`,
  styles: [`
    :host { display:block; min-height:100%; }
    .store-shell { --store-accent:#176b4a; --store-accent-dark:#104b35; --store-accent-soft:#eaf4ee; --store-ink:#17251d; display:flex; min-height:100dvh; flex-direction:column; background:#fff; color:var(--store-ink); }
    .store-announcement { display:flex; min-height:32px; align-items:center; justify-content:center; gap:9px; padding:6px 16px; background:var(--store-accent-dark); color:#f4faf6; font-size:.72rem; font-weight:600; letter-spacing:.035em; text-align:center; }
    .announcement-dot { width:6px; height:6px; flex:0 0 6px; border-radius:50%; background:#a9d6b9; box-shadow:0 0 0 3px #ffffff18; }
    .store-header { position:relative; z-index:30; width:100%; border-bottom:1px solid #edf0ed; background:rgba(255,255,255,.97); box-shadow:0 5px 22px #17251d08; }
    .header-inner { display:flex; width:min(100% - 48px,1280px); min-height:88px; align-items:center; justify-content:space-between; gap:28px; margin:0 auto; }
    .brand { display:flex; min-width:205px; align-items:center; gap:12px; color:var(--store-ink); text-decoration:none; }
    .brand img,.brand-mark { width:48px; height:48px; flex:0 0 48px; border:1px solid #e8eee9; border-radius:14px; object-fit:cover; }
    .brand-mark { display:grid; place-items:center; border-color:var(--store-accent-soft); background:var(--store-accent-soft); color:var(--store-accent); font-size:1.2rem; font-weight:800; }
    .brand-copy { display:flex; min-width:0; flex-direction:column; gap:4px; }
    .brand-name { overflow:hidden; color:#17251d; font-size:1.02rem; font-weight:800; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
    .brand-caption { color:#829087; font-size:.59rem; font-weight:750; letter-spacing:.14em; }
    .store-nav { display:flex; flex:1; align-items:center; justify-content:center; gap:5px; }
    .store-nav a { position:relative; padding:12px 16px; border-radius:9px; color:#59675e; font-size:.87rem; font-weight:650; text-decoration:none; transition:background .18s ease,color .18s ease; }
    .store-nav a:hover,.store-nav a.active { background:var(--store-accent-soft); color:var(--store-accent-dark); }
    .store-nav a.active::after { position:absolute; right:16px; bottom:5px; left:16px; height:2px; border-radius:2px; background:var(--store-accent); content:""; }
    .account { display:inline-flex; min-height:44px; flex:0 0 auto; align-items:center; justify-content:center; gap:9px; padding:0 17px; border:1px solid #dce6df; border-radius:11px; background:#fff; color:#24372b; font-size:.84rem; font-weight:700; text-decoration:none; transition:border-color .18s ease,background .18s ease,color .18s ease,transform .18s ease; }
    .account:hover { transform:translateY(-1px); border-color:var(--store-accent); background:var(--store-accent-soft); color:var(--store-accent-dark); }
    .account-icon { display:inline-flex; width:17px; height:17px; }
    .account-icon svg { width:100%; height:100%; }
    .store-menu-toggle { display:none; }
    #storefront-content { display:block; min-width:0; flex:1 0 auto; }
    .state { max-width:760px; margin:50px auto; padding:42px 24px; color:#66736a; text-align:center; }
    .state.error { color:#202923; }
    .state a { color:var(--store-accent); }
    .store-footer { margin-top:auto; padding:58px max(24px,calc((100vw - 1280px)/2)) 0; background:#102b20; color:#c1d0c6; }
    .footer-main { display:grid; grid-template-columns:minmax(280px,1.7fr) minmax(140px,.7fr) minmax(220px,1fr); gap:64px; max-width:1280px; margin:0 auto; padding-bottom:48px; }
    .footer-brand { display:inline-flex; align-items:center; gap:12px; margin-bottom:17px; color:#fff; font-size:1.1rem; font-weight:800; text-decoration:none; }
    .footer-brand img,.footer-brand-mark { width:42px; height:42px; flex:0 0 42px; border:1px solid #ffffff26; border-radius:12px; object-fit:cover; }
    .footer-brand-mark { display:grid; place-items:center; background:#ffffff14; color:#d8eee0; font-size:1.05rem; }
    .footer-brand-block p { max-width:430px; margin:0 0 18px; color:#b4c5ba; font-size:.88rem; line-height:1.8; }
    .footer-brand-block address { display:grid; gap:4px; color:#9fb3a6; font-size:.8rem; font-style:normal; line-height:1.6; }
    .footer-column { display:flex; flex-direction:column; align-items:flex-start; gap:13px; }
    .footer-column h2 { margin:4px 0 8px; color:#fff; font-size:.85rem; font-weight:750; letter-spacing:.07em; text-transform:uppercase; }
    .footer-column > a:not(.contact-link) { color:#b4c5ba; font-size:.86rem; text-decoration:none; transition:color .16s ease,transform .16s ease; }
    .footer-column > a:hover { transform:translateX(2px); color:#fff; }
    .contact-link { display:flex; max-width:100%; align-items:flex-start; gap:11px; color:#b4c5ba; font-size:.84rem; line-height:1.5; overflow-wrap:anywhere; text-decoration:none; transition:color .16s ease; }
    .contact-link:hover { color:#fff; }
    .contact-icon { display:inline-grid; width:25px; height:25px; flex:0 0 25px; place-items:center; border:1px solid #ffffff20; border-radius:8px; color:#c8e4d2; font-size:.8rem; }
    .footer-bottom { display:flex; min-height:66px; align-items:center; justify-content:space-between; gap:18px; border-top:1px solid #ffffff1c; color:#91a99a; font-size:.75rem; }
    .footer-powered strong { color:#e3eee7; font-weight:800; letter-spacing:.04em; }
    @media(max-width:980px) {
      .header-inner { width:calc(100% - 36px); gap:14px; }
      .brand { min-width:0; flex:1; }
      .store-menu-toggle { display:grid; width:42px; height:42px; flex:0 0 42px; align-content:center; justify-items:center; gap:5px; order:3; border:1px solid #dce6df; border-radius:11px; background:#fff; cursor:pointer; }
      .store-menu-toggle span { width:18px; height:2px; border-radius:2px; background:#26372c; }
      .store-nav { position:absolute; top:calc(100% + 1px); right:18px; left:18px; display:none; align-items:stretch; flex-direction:column; gap:3px; padding:10px; border:1px solid #e4ebe5; border-radius:14px; background:#fff; box-shadow:0 18px 38px #102b2022; }
      .store-nav.is-open { display:flex; }
      .store-nav a { padding:13px 14px; }
      .store-nav a.active::after { right:auto; bottom:9px; left:14px; width:3px; height:20px; }
      .account { margin-left:auto; }
      .footer-main { grid-template-columns:minmax(220px,1.4fr) 1fr 1fr; gap:32px; }
    }
    @media(max-width:640px) {
      .store-announcement { min-height:30px; font-size:.66rem; }
      .header-inner { width:calc(100% - 28px); min-height:74px; gap:9px; }
      .brand { gap:9px; }
      .brand img,.brand-mark { width:40px; height:40px; flex-basis:40px; border-radius:11px; }
      .brand-name { max-width:160px; font-size:.9rem; }
      .brand-caption { font-size:.52rem; }
      .account { min-height:40px; gap:6px; padding:0 10px; font-size:.76rem; }
      .account-icon { width:15px; height:15px; }
      .store-menu-toggle { width:39px; height:39px; flex-basis:39px; }
      .store-footer { padding:40px 22px 0; }
      .footer-main { grid-template-columns:1fr 1fr; gap:30px 22px; padding-bottom:34px; }
      .footer-brand-block { grid-column:1/-1; }
      .footer-bottom { min-height:62px; align-items:flex-start; flex-direction:column; justify-content:center; gap:6px; padding:13px 0; }
    }
    @media(max-width:380px) {
      .brand-name { max-width:112px; }
      .account { padding:0 8px; }
      .account-icon { display:none; }
      .footer-main { grid-template-columns:1fr; }
      .footer-brand-block { grid-column:1; }
    }
    @media(prefers-reduced-motion:reduce) {
      .store-nav a,.account,.footer-column > a,.contact-link { transition:none; }
      .account:hover,.footer-column > a:hover { transform:none; }
    }
  `],

})
export class StorefrontLayout implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly seo = inject(StorefrontSeoService);

  readonly context = inject(StorefrontContextService);
  readonly auth = inject(AuthService);
  slug = '';
  currentUrl = '';
  menuOpen = false;
  readonly year = new Date().getFullYear();

  get brandName(): string {
    const detail = this.context.detail();
    return detail?.storefront.title || detail?.business.business_name || 'Business storefront';
  }

  get navItems(): StorefrontNavItem[] {
    const base = ['/store', this.slug];
    return [
      { label: 'Home', commands: [...base], exact: true },
      { label: 'Products', commands: [...base, 'products'] },
      { label: 'About', commands: [...base, 'about'] },
      { label: 'Contact', commands: [...base, 'contact'] },
    ];
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { this.menuOpen = false; }

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => { this.currentUrl = event.urlAfterRedirects; });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('businessSlug') || '';
      this.slug = slug;
      this.currentUrl = this.router.url;
      this.closeMenu();

      void this.context.load(slug).then(() => {
        const detail = this.context.detail();
        if (!detail) return;
        const name = detail.storefront.title || detail.business.business_name;
        const description = detail.storefront.description || detail.business.business_description || `Explore products and services from ${name}.`;
        const path = `/store/${encodeURIComponent(slug)}`;
        this.seo.update(`${name} | Official Store`, description, path, {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name,
          description,
          url: path,
          ...(detail.business.business_phone ? { telephone: detail.business.business_phone } : {}),
          ...(detail.business.business_email ? { email: detail.business.business_email } : {}),
          ...(detail.business.address ? {
            address: {
              '@type': 'PostalAddress',
              ...(detail.business.address.address_line_1 ? { streetAddress: detail.business.address.address_line_1 } : {}),
              ...(detail.business.address.city ? { addressLocality: detail.business.address.city } : {}),
              ...(detail.business.address.state ? { addressRegion: detail.business.address.state } : {}),
              ...(detail.business.address.postal_code ? { postalCode: detail.business.address.postal_code } : {}),
              ...(detail.business.address.country_code ? { addressCountry: detail.business.address.country_code } : {}),
            },
          } : {}),
        });
      });
    });
  }
}
