import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { AuthPopupComponent } from './shared/auth-popup/auth-popup';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AuthPopupComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly menuOpen = signal(false);
  protected readonly theme = signal<'light' | 'dark'>('light');
  protected readonly currentYear = new Date().getFullYear();
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleTheme(): void {
    const nextTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}