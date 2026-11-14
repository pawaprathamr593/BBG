import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'bbg.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private mediaQuery?: MediaQueryList;

  readonly mode = signal<ThemeMode>('light');
  readonly resolvedMode = signal<ResolvedTheme>('light');
  readonly isDark = computed(() => this.resolvedMode() === 'dark');

  constructor() {
    let initial: ThemeMode = 'light';
    try {
      const saved = this.window?.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') initial = saved;
    } catch {
      // Continue with the default theme if browser storage is unavailable.
    }
    this.mediaQuery = this.window?.matchMedia?.('(prefers-color-scheme: dark)');
    this.mediaQuery?.addEventListener?.('change', () => {
      if (this.mode() === 'system') this.applyResolvedTheme();
    });
    this.setMode(initial, false);
  }

  setMode(mode: ThemeMode, persist = true): void {
    this.mode.set(mode);
    if (persist) {
      try {
        this.window?.localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {
        // Theme changes still apply for the current session without storage.
      }
    }
    this.applyResolvedTheme();
  }

  toggle(): void {
    this.setMode(this.resolvedMode() === 'light' ? 'dark' : 'light');
  }

  private applyResolvedTheme(): void {
    const resolved: ResolvedTheme = this.mode() === 'system'
      ? (this.mediaQuery?.matches ? 'dark' : 'light')
      : this.mode() as ResolvedTheme;
    this.resolvedMode.set(resolved);
    this.document.documentElement.setAttribute('data-theme', resolved);
  }
}
