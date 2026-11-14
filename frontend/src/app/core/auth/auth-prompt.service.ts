import { Injectable, signal } from '@angular/core';

export interface AuthPromptState {
  reason: string;
  top: number;
  left: number;
  arrowLeft: number;
  placement: 'below' | 'above';
}

@Injectable({ providedIn: 'root' })
export class AuthPromptService {
  readonly prompt = signal<AuthPromptState | null>(null);
  private pendingAction: (() => void | Promise<void>) | null = null;
  private anchor: HTMLElement | null = null;
  private reason = '';

  open(reason: string, anchor: HTMLElement, action?: () => void | Promise<void>): void {
    this.reason = reason;
    this.anchor = anchor;
    this.pendingAction = action ?? null;
    this.reposition();
  }

  reposition(): void {
    if (!this.anchor || !this.anchor.isConnected || typeof window === 'undefined') {
      if (this.prompt()) this.close();
      return;
    }

    const rect = this.anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(390, Math.max(280, viewportWidth - 32));
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), viewportWidth - width - 16);
    const availableBelow = Math.max(0, viewportHeight - rect.bottom - 24);
    const availableAbove = Math.max(0, rect.top - 24);
    const estimatedHeight = Math.min(520, viewportHeight - 32);
    const placement: 'below' | 'above' =
      availableBelow >= Math.min(estimatedHeight, 470) || availableBelow >= availableAbove ? 'below' : 'above';

    const visibleHeight = Math.max(180, Math.min(estimatedHeight, placement === 'below' ? availableBelow : availableAbove));
    const top = placement === 'below'
      ? Math.min(rect.bottom + 13, viewportHeight - visibleHeight - 16)
      : Math.max(16, rect.top - visibleHeight - 13);
    const arrowLeft = Math.min(Math.max(22, rect.left + rect.width / 2 - left), width - 22);

    this.prompt.set({ reason: this.reason, top, left, arrowLeft, placement });
  }

  close(): void {
    this.prompt.set(null);
    this.pendingAction = null;
    this.anchor = null;
    this.reason = '';
  }

  async complete(): Promise<void> {
    const action = this.pendingAction;
    this.close();
    if (action) await action();
  }
}
