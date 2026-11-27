import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { PwaInstallService } from '../../core/pwa/pwa-install.service';

@Component({
  selector: 'app-pwa-install-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pwa.guidePopup(); as state) {
      <div class="install-popup-backdrop" (click)="close()" role="presentation"></div>
      <section
        class="install-popup"
        [attr.data-has-anchor]="state.hasAnchor"
        [style.top.px]="state.hasAnchor ? state.top : null"
        [style.left.px]="state.hasAnchor ? state.left : null"
        [style.--arrow-offset]="state.arrowOffset + 'px'"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-popup-title"
      >
        <button
          type="button"
          class="popup-close"
          (click)="close()"
          aria-label="Close install dialog"
        >
          ×
        </button>

        <div class="install-popup-card">
          <div class="install-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3v12"></path>
              <path d="m7 10 5 5 5-5"></path>
              <path d="M5 21h14"></path>
            </svg>
          </div>

          <h2 id="install-popup-title">Install BBG App</h2>
          <p class="install-subtitle">
            Add Bavdhan Business Group to your home screen for instant access and an app-like
            experience.
          </p>

          @if (pwa.isIos()) {
            <ol class="install-steps">
              <li>Tap the <strong>Share</strong> icon in Safari's toolbar.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            </ol>
          } @else {
            <ol class="install-steps">
              <li>
                Open your browser menu or click the <strong>Install</strong> icon in the address
                bar.
              </li>
              <li>Select <strong>Install Bavdhan Business Group</strong>.</li>
            </ol>
          }

          <button type="button" class="install-primary-btn" (click)="installApp()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12"></path>
              <path d="m7 10 5 5 5-5"></path>
              <path d="M5 21h14"></path>
            </svg>
            <span>Install App</span>
          </button>

          @if (needsManualInstall()) {
            <p class="install-manual-hint" role="status">
              Direct install isn't available in this browser session — follow the steps above to
              install.
            </p>
          }
        </div>
      </section>
    }
  `,
  styles: `
    :host {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      pointer-events: none;
      z-index: 1100;
    }
    .install-popup-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: transparent;
      pointer-events: auto;
    }
    .install-popup {
      position: absolute;
      z-index: 1101;
      pointer-events: auto;
      box-sizing: border-box;
      width: min(360px, calc(100vw - 24px));
      filter: drop-shadow(0 14px 36px rgba(0, 0, 0, 0.22));
      animation: install-popup-anchored 0.16s ease-out;
    }
    .install-popup[data-has-anchor='true']:before {
      content: '';
      position: absolute;
      z-index: 5;
      top: -5px;
      left: calc(var(--arrow-offset, 40px) - 6px);
      width: 12px;
      height: 12px;
      background: rgba(255, 255, 255, 0.96);
      transform: rotate(45deg);
      pointer-events: none;
    }
    :host-context(html[data-theme='dark']) .install-popup[data-has-anchor='true']:before,
    :host-context(body.dark-theme) .install-popup[data-has-anchor='true']:before {
      background: rgba(18, 32, 24, 0.96);
    }
    .install-popup[data-has-anchor='false'] {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: install-popup-centered 0.16s ease-out;
    }
    .install-popup[data-has-anchor='false']:before {
      display: none;
    }
    @keyframes install-popup-anchored {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes install-popup-centered {
      from {
        opacity: 0;
        transform: translate(-50%, calc(-50% - 6px));
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }
    .popup-close {
      position: absolute;
      z-index: 10;
      top: 10px;
      right: 10px;
      width: 25px;
      height: 25px;
      border: 1px solid var(--border, #e3e8e4);
      border-radius: 50%;
      background: var(--surface-subtle, #f0f3f8);
      color: var(--text-secondary, #536178);
      font-size: 19px;
      line-height: 1;
      cursor: pointer;
    }
    .popup-close:hover {
      background: var(--surface-page, #e4eaf2);
      color: var(--text-primary, #171d19);
    }
    .install-popup-card {
      box-sizing: border-box;
      padding: 24px 20px 20px;
      border-radius: var(--bbg-radius-xl, 16px);
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: var(--bbg-glass-blur-sm);
      -webkit-backdrop-filter: var(--bbg-glass-blur-sm);
      border: 1px solid var(--bbg-glass-border, var(--border, #e3e8e4));
      box-shadow: var(--bbg-glass-shadow), var(--bbg-glass-highlight);
      color: var(--bbg-text-primary, var(--text-primary, #171d19));
      text-align: center;
    }
    :host-context(html[data-theme='dark']) .install-popup-card,
    :host-context(body.dark-theme) .install-popup-card {
      background: rgba(18, 32, 24, 0.96);
    }
    .install-mark {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      margin: 0 auto 14px;
      border-radius: 13px;
      background: #174d35;
      color: #f5d928;
    }
    .install-mark svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .install-subtitle {
      margin: 0 0 16px;
      color: var(--bbg-text-secondary, var(--text-secondary, #536178));
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .install-steps {
      margin: 0 0 18px;
      padding: 12px 14px 12px 30px;
      border-radius: var(--bbg-radius-md, 10px);
      background: var(--bbg-surface-subtle, rgba(23, 77, 53, 0.06));
      border: 1px solid var(--bbg-border-default, #e3e8e4);
      text-align: left;
      font-size: 0.84rem;
      line-height: 1.55;
      display: grid;
      gap: 6px;
    }
    .install-primary-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      min-height: 42px;
      border: 0;
      border-radius: var(--bbg-radius-md, 10px);
      background: var(--bbg-brand-accent, #f5d928);
      color: #000000;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .install-primary-btn:hover {
      background: #ffe95b;
    }
    .install-primary-btn svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .install-manual-hint {
      margin: 10px 0 0;
      font-size: 0.78rem;
      line-height: 1.45;
      color: var(--bbg-text-secondary, var(--text-secondary, #536178));
    }
  `,
})
export class PwaInstallPopupComponent {
  readonly pwa = inject(PwaInstallService);
  readonly needsManualInstall = signal(false);

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.pwa.guidePopup()) this.close();
  }

  close(): void {
    this.needsManualInstall.set(false);
    this.pwa.closeGuidePopup();
  }

  async installApp(): Promise<void> {
    const triggered = await this.pwa.promptInstall();
    if (!triggered) {
      this.needsManualInstall.set(true);
    }
  }
}
