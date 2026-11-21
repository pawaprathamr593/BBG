import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { WhatsAppService } from '../../core/whatsapp/whatsapp.service';
import type { MarketplaceBusinessDetail } from '../../core/marketplace/marketplace-api.service';
import { StorefrontContextService } from './storefront-context.service';
import { UserProfileDrawerComponent } from '../../shared/user-profile-drawer/user-profile-drawer';

interface StorefrontNavItem {
  label: string;
  commands: Array<string>;
  exact?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-storefront-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UserProfileDrawerComponent],
  providers: [StorefrontContextService],
  templateUrl: './storefront-layout.html',
  styleUrl: './storefront-layout.scss',
})
export class StorefrontLayout implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly context = inject(StorefrontContextService);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly whatsApp = inject(WhatsAppService);
  slug = '';
  currentUrl = '';
  menuOpen = false;
  readonly year = new Date().getFullYear();

  isWhatsAppAvailable(data: MarketplaceBusinessDetail): boolean {
    const country = data.business.address?.country_code ?? data.business.country_code;
    return this.whatsApp.isWhatsAppAvailable(
      data.business.whatsapp_number,
      data.storefront.whatsapp_enabled,
      country,
    );
  }

  whatsappUrl(data: MarketplaceBusinessDetail): string | null {
    const name = data.business.business_name || this.brandName;
    const country = data.business.address?.country_code ?? data.business.country_code;
    return this.whatsApp.buildBusinessEnquiryUrl(name, data.business.whatsapp_number, country);
  }

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

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
  closeMenu(): void {
    this.menuOpen = false;
  }
  toggleTheme(): void {
    this.theme.toggle();
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl = event.urlAfterRedirects;
      });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('businessSlug') || '';
      this.slug = slug;
      this.currentUrl = this.router.url;
      this.closeMenu();

      void this.context.load(slug);
    });
  }
}
