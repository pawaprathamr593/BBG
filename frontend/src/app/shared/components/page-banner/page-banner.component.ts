import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface BannerChip {
  label: string;
  count?: number | string;
  active?: boolean;
}

@Component({
  selector: 'app-page-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="bbg-page-banner"
      [class.banner-discovery]="variant() === 'discovery'"
      [class.banner-compact]="variant() === 'compact'"
    >
      <div class="banner-inner">
        <div class="banner-copy">
          @if (eyebrow()) {
            <div class="banner-eyebrow">
              <span class="eyebrow-dot" aria-hidden="true"></span>
              <span>{{ eyebrow() }}</span>
            </div>
          }

          <h1 class="banner-title">
            {{ title() }}
            @if (titleAccent()) {
              <span class="accent-text"> {{ titleAccent() }}</span>
            }
          </h1>

          @if (description()) {
            <p class="banner-description">{{ description() }}</p>
          }

          <div class="banner-search-slot">
            <ng-content select="[bannerSearch]" />
          </div>

          @if (chips().length) {
            <div class="banner-chips" role="group" aria-label="Quick filters">
              <span class="chips-label">Popular:</span>
              @for (chip of chips(); track chip.label) {
                <span class="banner-chip" [class.is-active]="chip.active">
                  {{ chip.label }}
                  @if (chip.count !== undefined) {
                    <small>({{ chip.count }})</small>
                  }
                </span>
              }
            </div>
          }
        </div>

        <div class="banner-actions-slot">
          <ng-content select="[bannerActions]" />
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .bbg-page-banner {
        position: relative;
        isolation: isolate;
        width: 100%;
        color: #ffffff;
        background: linear-gradient(
          135deg,
          var(--bbg-brand-900, #0b3020) 0%,
          #123f2c 48%,
          var(--bbg-brand-primary, #174d35) 100%
        );
        box-shadow: 0 16px 40px rgba(11, 48, 32, 0.12);
        transition: background 0.2s ease;
      }

      .banner-discovery {
        min-height: 200px;
        padding: 44px max(24px, calc((100vw - 1360px) / 2)) 40px;
        border-radius: 0 0 var(--bbg-radius-2xl, 20px) var(--bbg-radius-2xl, 20px);
      }

      .banner-compact {
        min-height: 120px;
        padding: 24px max(24px, calc((100vw - 1360px) / 2));
        border-radius: 0;
      }

      .banner-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 28px;
        flex-wrap: wrap;
      }

      .banner-copy {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 680px;
        flex: 1 1 320px;
      }

      .banner-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        background: rgba(245, 217, 40, 0.14);
        border: 1px solid rgba(245, 217, 40, 0.35);
        border-radius: var(--bbg-radius-full, 9999px);
        color: var(--bbg-brand-accent, #f5d928);
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        width: fit-content;
      }

      .eyebrow-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--bbg-brand-accent, #f5d928);
        box-shadow: 0 0 6px var(--bbg-brand-accent, #f5d928);
      }

      .banner-title {
        font-size: clamp(1.8rem, 3.5vw, 2.75rem);
        font-weight: 850;
        letter-spacing: -0.035em;
        line-height: 1.15;
        margin: 0;
        color: #ffffff;
      }

      .accent-text {
        color: var(--bbg-brand-accent, #f5d928);
      }

      .banner-description {
        font-size: 0.95rem;
        color: rgba(255, 255, 255, 0.88);
        line-height: 1.55;
        margin: 0;
        max-width: 600px;
      }

      .banner-search-slot {
        width: 100%;
        margin-top: 6px;
      }

      .banner-chips {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
      }

      .chips-label {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.65);
        font-weight: 600;
      }

      .banner-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: var(--bbg-radius-full, 9999px);
        color: #ffffff;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .banner-chip:hover,
      .banner-chip.is-active {
        background: var(--bbg-brand-accent, #f5d928);
        color: #000000;
        border-color: var(--bbg-brand-accent, #f5d928);
      }

      .banner-chip small {
        opacity: 0.8;
      }

      .banner-actions-slot {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      @media (max-width: 768px) {
        .banner-discovery {
          padding: 32px 18px 28px;
        }
        .banner-compact {
          padding: 20px 16px;
        }
        .banner-title {
          font-size: 1.65rem;
        }
      }
    `,
  ],
})
export class PageBannerComponent {
  readonly title = input.required<string>();
  readonly titleAccent = input<string>('');
  readonly eyebrow = input<string>('');
  readonly description = input<string>('');
  readonly variant = input<'discovery' | 'compact'>('discovery');
  readonly chips = input<BannerChip[]>([]);
}
