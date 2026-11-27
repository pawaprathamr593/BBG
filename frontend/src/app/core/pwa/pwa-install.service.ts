import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface InstallPopupState {
  top: number;
  left: number;
  arrowOffset: number;
  hasAnchor: boolean;
}

/**
 * Tracks browser PWA installability (`beforeinstallprompt`), triggers direct
 * installation when supported, and falls back to an anchored install popup.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal(false);
  readonly isInstalled = signal(false);
  readonly isIos = signal(false);
  readonly guidePopup = signal<InstallPopupState | null>(null);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    const win = this.document.defaultView;
    if (!win) return;

    const nav = win.navigator as Navigator & { standalone?: boolean };
    this.isIos.set(/iphone|ipad|ipod/i.test(nav.userAgent));

    const standalone =
      win.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
    if (standalone) {
      this.isInstalled.set(true);
      return;
    }

    const winWithPrompt = win as Window & { __bbgDeferredInstallPrompt?: Event | null };
    if (winWithPrompt.__bbgDeferredInstallPrompt) {
      this.deferredPrompt = winWithPrompt.__bbgDeferredInstallPrompt as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    }

    win.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      winWithPrompt.__bbgDeferredInstallPrompt = event;
      this.canInstall.set(true);
    });

    win.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      winWithPrompt.__bbgDeferredInstallPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
      this.guidePopup.set(null);
    });
  }

  async triggerInstall(anchor?: HTMLElement | null): Promise<void> {
    if (this.deferredPrompt) {
      await this.promptInstall();
      return;
    }
    this.openGuidePopup(anchor);
  }

  openGuidePopup(anchor?: HTMLElement | null): void {
    const win = this.document.defaultView;
    if (!win || !anchor || win.innerWidth <= 1000) {
      this.guidePopup.set({ top: 0, left: 0, arrowOffset: 40, hasAnchor: false });
      return;
    }

    const width = Math.min(360, win.innerWidth - 24);
    const gap = 10;
    const scrollY = win.scrollY || win.pageYOffset || this.document.documentElement.scrollTop || 0;
    const scrollX = win.scrollX || win.pageXOffset || this.document.documentElement.scrollLeft || 0;
    const rect = anchor.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const viewportLeft = Math.min(
      Math.max(12, centerX - width / 2),
      win.innerWidth - width - 12,
    );
    const left = viewportLeft + scrollX;
    const top = Math.max(scrollY + 68, rect.bottom + scrollY + gap);
    const arrowOffset = Math.min(Math.max(centerX - viewportLeft, 24), width - 24);

    this.guidePopup.set({ top, left, arrowOffset, hasAnchor: true });
  }

  closeGuidePopup(): void {
    this.guidePopup.set(null);
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;
    const promptEvent = this.deferredPrompt;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    this.deferredPrompt = null;
    (this.document.defaultView as (Window & { __bbgDeferredInstallPrompt?: Event | null }) | null)!
      .__bbgDeferredInstallPrompt = null;
    this.canInstall.set(false);
    if (outcome === 'accepted') {
      this.guidePopup.set(null);
    }
    return outcome === 'accepted';
  }
}
