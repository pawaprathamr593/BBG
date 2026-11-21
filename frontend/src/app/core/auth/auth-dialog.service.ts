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
    const height = Math.min(440, window.innerHeight - 24);
    const gap = 12;
    let top = Math.max(12, (window.innerHeight - height) / 2);
    let left = Math.max(12, (window.innerWidth - width) / 2);
    let placement: AuthDialogState['placement'] = 'bottom';
    let arrowOffset = 40;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      left = Math.min(Math.max(12, centerX - width / 2), window.innerWidth - width - 12);
      top = rect.bottom + gap;
      if (top + height > window.innerHeight - 12) {
        top = rect.top - height - gap;
        placement = 'top';
      }
      if (top < 12) {
        top = Math.max(12, Math.min(rect.top, window.innerHeight - height - 12));
        placement = rect.bottom < window.innerHeight / 2 ? 'bottom' : 'top';
      }
      arrowOffset = Math.min(Math.max(centerX - left, 24), width - 24);
    }
    this.state.set({ reason, mode, top, left, placement, arrowOffset });
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
