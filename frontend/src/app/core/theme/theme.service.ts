import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly preference = signal<ThemePreference>('system');
  readonly resolvedTheme = signal<'light' | 'dark'>('light');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    let saved: ThemePreference = 'system';
    try {
      const value = window.localStorage.getItem('bbg-theme');
      if (value === 'light' || value === 'dark' || value === 'system') saved = value;
    } catch { /* Storage can be unavailable in private browsing contexts. */ }
    this.preference.set(saved);
    this.apply(saved);
    if (typeof window.matchMedia === 'function') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
        if (this.preference() === 'system') this.apply('system');
      });
    }
  }

  toggle(): void {
    const next = this.resolvedTheme() === 'dark' ? 'light' : 'dark';
    this.setPreference(next);
  }

  setPreference(value: ThemePreference): void {
    this.preference.set(value);
    if (isPlatformBrowser(this.platformId)) {
      try { window.localStorage.setItem('bbg-theme', value); } catch { /* Keep the in-memory preference. */ }
    }
    this.apply(value);
  }

  private prefersDark(): boolean {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private apply(value: ThemePreference): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const dark = value === 'dark' || (value === 'system' && this.prefersDark());
    const theme = dark ? 'dark' : 'light';
    this.resolvedTheme.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    this.document.documentElement.style.colorScheme = theme;
  }
}
