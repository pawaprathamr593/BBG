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
  template: `
    <div class="store-shell">
      @if (context.loading()) {
        <div class="state" role="status">Loading storefront…</div>
      } @else if (context.error()) {
        <main class="state error" role="alert">
          <h1>Storefront unavailable</h1>
          <p>{{ context.error() }}</p>
          <a routerLink="/businesses">Browse businesses</a>
        </main>
      } @else if (context.detail(); as data) {
        <header class="store-header">
          <a class="brand" [routerLink]="['/store', slug]" aria-label="Store home" (click)="closeMenu()">
            @if (data.business.logo_path) {
              <img [src]="data.business.logo_path" [alt]="brandName + ' logo'" />
            } @else {
              <span class="brand-mark" aria-hidden="true">{{ brandName.slice(0, 1).toUpperCase() }}</span>
            }
            <span class="brand-name">{{ brandName }}</span>
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
            {{ auth.isAuthenticated() ? 'My account' : 'Sign in' }}
          </a>
        </header>

        <main id="storefront-content">
          <router-outlet />
        </main>

        <footer class="store-footer">
          <div class="footer-business">
            <a class="footer-brand" [routerLink]="['/store', slug]">{{ brandName }}</a>
            <p>{{ data.storefront.description || data.business.business_description || 'Discover products and connect with our business.' }}</p>
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
            <div class="footer-column">
              <h2>Contact</h2>
              @if (data.business.business_phone) {
                <a [href]="'tel:' + data.business.business_phone">{{ data.business.business_phone }}</a>
              }
              @if (data.business.business_email) {
                <a [href]="'mailto:' + data.business.business_email">{{ data.business.business_email }}</a>
              }
              @if (data.storefront.whatsapp_enabled && data.business.whatsapp_number) {
                <a [href]="'https://wa.me/' + data.business.whatsapp_number.replace('+', '')"
                  target="_blank" rel="noopener noreferrer">WhatsApp</a>
              }
            </div>
          }

          <div class="footer-bottom">
            <span>© {{ year }} {{ data.business.business_name }}</span>
          </div>
        </footer>
      }
    </div>
  `,
  styles: [`
    :host { display:block; min-height:100%; }
    .store-shell { --store-accent:#174d35; --store-accent-soft:#eaf2ed; display:flex; min-height:100dvh; flex-direction:column; background:#fff; color:#202923; }
    .store-header { position:relative; z-index:20; display:flex; width:100%; min-height:82px; align-items:center; gap:30px; padding:12px max(24px,calc((100vw - 1240px)/2)); background:#fff; border-bottom:1px solid #e8ece9; }
    .brand { display:flex; min-width:190px; align-items:center; gap:12px; color:#17251c; font-size:1.08rem; font-weight:800; text-decoration:none; }
    .brand img,.brand-mark { width:44px; height:44px; flex:0 0 44px; border-radius:12px; object-fit:cover; }
    .brand-mark { display:grid; place-items:center; background:var(--store-accent-soft); color:var(--store-accent); font-size:1.15rem; }
    .brand-name { overflow:hidden; text-overflow:ellipsis; }
    .store-nav { display:flex; flex:1; align-items:center; justify-content:center; gap:7px; }
    .store-nav a,.account { padding:11px 13px; border-radius:9px; color:#58645c; font-size:.86rem; font-weight:650; text-decoration:none; white-space:nowrap; transition:background .16s ease,color .16s ease; }
    .store-nav a:hover,.store-nav a.active { background:var(--store-accent-soft); color:var(--store-accent); }
    .account { border:1px solid #dce4de; color:#26372c; }
    .account:hover { border-color:var(--store-accent); color:var(--store-accent); }
    .store-menu-toggle { display:none; }
    #storefront-content { display:block; flex:1 0 auto; min-width:0; }
    .state { max-width:760px; margin:50px auto; padding:42px 24px; color:#66736a; text-align:center; }
    .state.error { color:#202923; }
    .state a { color:var(--store-accent); }
    .store-footer { display:grid; grid-template-columns:minmax(240px,1.5fr) minmax(130px,.7fr) minmax(180px,.8fr); gap:36px; width:100%; margin-top:auto; padding:48px max(24px,calc((100vw - 1240px)/2)) 22px; border-top:1px solid #e8ece9; background:#f8faf8; color:#5c685f; }
    .footer-brand { display:inline-block; margin-bottom:10px; color:#1c2c21; font-size:1.05rem; font-weight:800; text-decoration:none; }
    .footer-business p { max-width:460px; margin:0 0 14px; font-size:.88rem; line-height:1.7; }
    address { display:grid; gap:4px; font-size:.82rem; font-style:normal; line-height:1.5; }
    .footer-column { display:flex; flex-direction:column; align-items:flex-start; gap:10px; }
    .footer-column h2 { margin:0 0 5px; color:#26372c; font-size:.9rem; }
    .footer-column a { color:#5c685f; font-size:.84rem; text-decoration:none; overflow-wrap:anywhere; }
    .footer-column a:hover { color:var(--store-accent); }
    .footer-bottom { grid-column:1/-1; padding-top:18px; border-top:1px solid #e4eae5; color:#758078; font-size:.76rem; }
    @media(max-width:900px) {
      .store-header { gap:12px; padding:12px 20px; }
      .brand { min-width:0; flex:1; }
      .store-menu-toggle { display:grid; width:40px; height:40px; align-content:center; justify-items:center; gap:5px; border:1px solid #dce4de; border-radius:9px; background:#fff; cursor:pointer; }
      .store-menu-toggle span { width:17px; height:2px; border-radius:2px; background:#26372c; }
      .store-nav { position:absolute; top:calc(100% + 1px); right:14px; left:14px; display:none; align-items:stretch; flex-direction:column; gap:3px; padding:9px; border:1px solid #e4eae5; border-radius:13px; background:#fff; box-shadow:0 16px 34px #18251c1c; }
      .store-nav.is-open { display:flex; }
      .store-nav a { padding:12px; }
      .store-footer { grid-template-columns:1fr 1fr; gap:26px; padding:34px 22px 20px; }
      .footer-business { grid-column:1/-1; }
    }
    @media(max-width:520px) {
      .store-header { min-height:70px; padding:10px 14px; }
      .brand img,.brand-mark { width:38px; height:38px; flex-basis:38px; }
      .brand-name { font-size:.94rem; }
      .account { padding:9px 10px; font-size:.78rem; }
      .store-footer { grid-template-columns:1fr; gap:22px; padding:30px 18px 18px; }
      .footer-business,.footer-bottom { grid-column:1; }
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
