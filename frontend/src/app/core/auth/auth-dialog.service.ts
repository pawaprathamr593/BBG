import { Injectable, inject, signal } from '@angular/core';
import { SocialAuthIntent } from './auth.models';
import { AuthService } from './auth.service';

export interface AuthDialogState {
  reason: string;
  mode: SocialAuthIntent;
  top: number;
  left: number;
  placement: 'bottom' | 'top' | 'left' | 'right';
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
    // Reserve enough room for the compact social-first popup and its email form.
    const width = Math.min(340, window.innerWidth - 24);
    const height = Math.min(360, window.innerHeight - 32);
    const gap = 10;
    let top = Math.max(16, (window.innerHeight - height) / 2);
    let left = Math.max(12, (window.innerWidth - width) / 2);
    let placement: AuthDialogState['placement'] = 'bottom';

    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      top = rect.bottom + gap;

      if (top + height > window.innerHeight - 12) {
        top = rect.top - height - gap;
        placement = 'top';
      }

      if (top < 12) {
        top = Math.max(12, Math.min(rect.top, window.innerHeight - height - 12));
        if (rect.right + width + gap <= window.innerWidth) {
          left = rect.right + gap;
          placement = 'left';
        } else if (rect.left - width - gap >= 0) {
          left = rect.left - width - gap;
          placement = 'right';
        } else {
          top = Math.max(12, window.innerHeight - height - 12);
          left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
          placement = 'top';
        }
      }
    }

    this.state.set({ reason, mode, top, left, placement });
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