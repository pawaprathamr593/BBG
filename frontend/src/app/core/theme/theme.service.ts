import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly mode = signal<ThemeMode>('light');

  constructor() {
    const initial = this.document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    this.setMode(initial);
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.document.documentElement.setAttribute('data-theme', mode);
  }

  toggle(): void {
    this.setMode(this.mode() === 'light' ? 'dark' : 'light');
  }
}
