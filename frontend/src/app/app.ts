import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/auth/auth.service';
import { AuthPopupComponent } from './shared/auth-popup/auth-popup';
import { PwaInstallPopupComponent } from './shared/pwa-install-popup/pwa-install-popup';
import { PwaInstallService } from './core/pwa/pwa-install.service';
import { ThemeService } from './core/theme/theme.service';
import { UserProfileDrawerComponent } from './shared/user-profile-drawer/user-profile-drawer';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    AuthPopupComponent,
    PwaInstallPopupComponent,
    UserProfileDrawerComponent,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly menuOpen = signal(false);
  protected readonly theme = inject(ThemeService);
  protected readonly pwa = inject(PwaInstallService);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly auth = inject(AuthService);
  protected readonly isStorefrontRoute = signal(false);
  protected readonly isWorkspaceRoute = signal(false);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  constructor() {
    this.syncShellWithRoute(this.document.location?.pathname || this.router.url);
    void this.auth.restoreSession();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.syncShellWithRoute(event.urlAfterRedirects));
  }

  private syncShellWithRoute(url: string): void {
    const path = url.split(/[?#]/, 1)[0];
    this.isStorefrontRoute.set(path.startsWith('/store/'));
    this.isWorkspaceRoute.set(path === '/dashboard' || path.startsWith('/dashboard/'));
    this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen()) this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.menuOpen()) return;
    const header = this.hostEl.nativeElement.querySelector('.topbar');
    if (header && !header.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.menuOpen() && window.innerWidth > 1000) {
      this.closeMenu();
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected installApp(event?: Event): void {
    const anchor = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void this.pwa.triggerInstall(anchor);
    this.closeMenu();
  }
}
