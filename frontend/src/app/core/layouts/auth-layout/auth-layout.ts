import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../theme/theme.service';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {
  protected readonly currentYear = new Date().getFullYear();
  private readonly themeService = inject(ThemeService);

  protected get isDarkTheme(): boolean {
    return this.themeService.resolvedTheme() === 'dark';
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
  }
}
