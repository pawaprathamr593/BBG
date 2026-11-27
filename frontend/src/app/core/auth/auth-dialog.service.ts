import { Injectable, inject, signal } from '@angular/core';
import { SocialAuthIntent } from './auth.models';
import { AuthService } from './auth.service';

export interface AuthDialogState {
  reason: string;
  mode: SocialAuthIntent;
  top: number;
  left: number;
  placement: 'bottom' | 'top';
  arrowOffset: number;
  hasAnchor?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthDialogService {
  private readonly auth = inject(AuthService);
  readonly state = signal<AuthDialogState | null>(null);
  private pendingAction: (() => void | Promise<void>) | null = null;

  async requireAuthentication(
    reason: string,
    anchor: HTMLElement | null,
    action: () => void | Promise<void>,
    mode: SocialAuthIntent = 'login',
  ): Promise<void> {
    if (this.auth.isAuthenticated()) {
      await action();
      return;
    }
    this.open(reason, anchor, mode, action);
  }

  open(
    reason: string,
    anchor?: HTMLElement | null,
    mode: SocialAuthIntent = 'login',
    onAuthenticated?: () => void | Promise<void>,
  ): void {
    this.pendingAction = onAuthenticated ?? null;
    const width = Math.min(360, window.innerWidth - 24);
    const estimatedHeight = 320;
    const headerHeight = 56;
    const gap = 10;
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const hasAnchor = !!anchor;

    let top = scrollY + Math.max(headerHeight + 12, (window.innerHeight - estimatedHeight) / 2);
    let left = scrollX + Math.max(12, (window.innerWidth - width) / 2);
    let placement: AuthDialogState['placement'] = 'bottom';
    let arrowOffset = 40;

    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const viewportLeft = Math.min(
        Math.max(12, centerX - width / 2),
        window.innerWidth - width - 12,
      );
      left = viewportLeft + scrollX;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top - headerHeight;

      if (spaceBelow < estimatedHeight + gap && spaceAbove > spaceBelow) {
        placement = 'top';
        top = Math.max(scrollY + headerHeight + 12, rect.top + scrollY - gap);
      } else {
        placement = 'bottom';
        top = Math.max(scrollY + headerHeight + 12, rect.bottom + scrollY + gap);
      }
      arrowOffset = Math.min(Math.max(centerX - viewportLeft, 24), width - 24);
    }
    this.state.set({ reason, mode, top, left, placement, arrowOffset, hasAnchor });
  }

  close(): void {
    this.state.set(null);
    this.pendingAction = null;
  }

  async complete(): Promise<void> {
    const action = this.pendingAction;
    this.state.set(null);
    this.pendingAction = null;
    await action?.();
  }
}
