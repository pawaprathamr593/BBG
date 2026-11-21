import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketplaceApiService } from '../../../core/marketplace/marketplace-api.service';

@Component({
  selector: 'app-marketplace-item-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './marketplace-item-placeholder.html',
  styles: [
    `
      :host {
        display: block;
      }
      .detail-page {
        display: grid;
        min-height: 62vh;
        place-items: center;
        padding: 48px 20px;
        background: var(--surface-page);
      }
      .detail-card {
        width: min(620px, 100%);
        padding: clamp(25px, 5vw, 44px);
        background: var(--surface-card);
        border: 1px solid var(--border);
        border-radius: 18px;
        text-align: center;
      }
      .eyebrow {
        margin: 0 0 18px;
        color: #648071;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.15em;
      }
      .item-type {
        display: inline-block;
        padding: 6px 11px;
        color: #315d47;
        background: #eaf2ec;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 750;
      }
      h1 {
        margin: 17px 0 10px;
        color: var(--text-primary);
        font-size: clamp(1.7rem, 4vw, 2.3rem);
        letter-spacing: -0.05em;
      }
      .message {
        max-width: 470px;
        margin: 0 auto;
        color: var(--text-secondary);
        font-size: 0.9rem;
        line-height: 1.65;
      }
      .reference {
        margin: 20px 0;
        color: var(--text-secondary);
        font-size: 0.78rem;
      }
      .reference strong {
        color: var(--text-primary);
      }
      a {
        display: inline-flex;
        margin-top: 7px;
        padding: 11px 16px;
        color: #fff;
        background: #174d35;
        border-radius: 9px;
        font-size: 0.82rem;
        font-weight: 750;
        text-decoration: none;
      }
    `,
  ],
})
export class MarketplaceItemPlaceholder implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly marketplaceApi = inject(MarketplaceApiService);
  protected readonly itemType = String(this.route.snapshot.data['itemType'] ?? 'Marketplace item');
  protected readonly directoryLink = String(this.route.snapshot.data['directoryLink'] ?? '/');
  protected readonly identifier = this.route.snapshot.paramMap.get('identifier') ?? '';
  ngOnInit(): void {
    if (this.itemType !== 'Product') return;
    const productId = Number(this.identifier);
    if (!Number.isSafeInteger(productId) || productId <= 0) return;
    this.marketplaceApi.recordProductView(productId, this.visitorKey()).subscribe({
      error: () => undefined,
    });
  }

  private visitorKey(): string {
    const storageKey = 'bbg-marketplace-visitor-key';
    try {
      const existing = localStorage.getItem(storageKey);
      if (existing) return existing;
      const generated =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(storageKey, generated);
      return generated;
    } catch {
      return `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
}
