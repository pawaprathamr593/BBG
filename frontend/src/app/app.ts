import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/auth/auth.service';
import { AuthPopupComponent } from './shared/auth-popup/auth-popup';
import { ThemeService } from './core/theme/theme.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AuthPopupComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly menuOpen = signal(false);
  protected readonly theme = inject(ThemeService);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly auth = inject(AuthService);
  protected readonly isStorefrontRoute = signal(false);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.syncShellWithRoute(this.document.location?.pathname || this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => this.syncShellWithRoute(event.urlAfterRedirects));
  }

  private syncShellWithRoute(url: string): void {
    this.isStorefrontRoute.set(url.split(/[?#]/, 1)[0].startsWith('/store/'));
    this.closeMenu();
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

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}