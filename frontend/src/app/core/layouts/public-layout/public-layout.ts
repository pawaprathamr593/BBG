import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';

@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout {
  protected readonly menuOpen = signal(false);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected closeMenu(): void { this.menuOpen.set(false); }
  protected toggleMenu(): void { this.menuOpen.update((open) => !open); }

  protected async signOut(): Promise<void> {
    try { await this.auth.logout(); }
    finally {
      this.closeMenu();
      await this.router.navigateByUrl('/');
    }
  }
}
