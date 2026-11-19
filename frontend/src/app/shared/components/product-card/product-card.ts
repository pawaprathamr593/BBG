import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ProductCardModel } from '../../models/marketplace-card.models';

@Component({
  selector: 'app-product-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="product-card">
      <div class="media">
        @if (product().primary_image_url || primaryImage()) {
          <img [src]="product().primary_image_url || primaryImage()" [alt]="product().product_name" loading="lazy">
        } @else if (primaryVideo()) {
          <video [src]="primaryVideo()" muted autoplay loop playsinline preload="metadata" [attr.aria-label]="product().product_name + ' video preview'"></video>
        } @else {
          <span class="placeholder" aria-hidden="true">{{ product().product_name.slice(0, 1).toUpperCase() }}</span>
        }
        @if (product().category_name) { <span class="category">{{ product().category_name }}</span> }
        @if ((product().media?.length ?? 0) > 1) { <span class="media-count">+{{ product().media!.length - 1 }} media</span> }
      </div>
      <div class="body">
        @if (product().brand_name) { <p class="brand">{{ product().brand_name }}</p> }
        <h3>{{ product().product_name }}</h3>
        @if (product().description) { <p class="description">{{ product().description }}</p> }
        <div class="price-row">
          @if (showPrice() && product().selling_price !== undefined) {
            <strong>{{ currency() }}{{ product().selling_price }} <small>/ {{ product().unit.symbol }}</small></strong>
          } @else {
            <strong class="enquire">Enquire for price</strong>
          }
        </div>
        @if (product().business?.business_name) { <p class="seller">{{ product().business.business_name }}</p> }
        <button type="button" class="action" (click)="selected.emit(product())">
          {{ actionLabel() }} <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  `,
  styles: [`
    :host{display:block;min-width:0}.product-card{height:100%;overflow:hidden;border:1px solid var(--border);border-radius:12px;background:var(--surface-card);color:var(--text-primary);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.product-card:hover{transform:translateY(-3px);border-color:var(--brand);box-shadow:0 12px 28px #1d392510}.media{position:relative;display:grid;aspect-ratio:4/3;overflow:hidden;place-items:center;background:var(--surface-subtle)}.media img,.media video{width:100%;height:100%;object-fit:cover}.placeholder{color:var(--brand-strong);font-size:4.5rem;font-weight:500;opacity:.55}.category{position:absolute;top:11px;left:11px;max-width:65%;overflow:hidden;padding:6px 8px;border:1px solid #ffffff80;border-radius:5px;background:#ffffffd9;color:#254c36;font-size:.6rem;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.media-count{position:absolute;right:10px;bottom:10px;padding:5px 8px;border-radius:5px;background:#102c1dcc;color:#fff;font-size:.62rem;font-weight:750}.body{padding:14px}.brand{margin:0 0 5px;color:var(--text-muted);font-size:.66rem;font-weight:700}.body h3{display:-webkit-box;overflow:hidden;margin:0;color:var(--text-primary);font-size:.92rem;font-weight:700;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.description{display:-webkit-box;min-height:3em;overflow:hidden;margin:9px 0;color:var(--text-secondary);font-size:.72rem;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.price-row{padding-top:9px;border-top:1px solid var(--border)}.price-row strong{color:var(--brand-strong);font-size:.88rem}.price-row small{color:var(--text-secondary);font-size:.65rem;font-weight:500}.price-row .enquire{font-size:.72rem}.seller{overflow:hidden;margin:8px 0 0;color:var(--text-secondary);font-size:.68rem;text-overflow:ellipsis;white-space:nowrap}.action{display:flex;width:100%;align-items:center;justify-content:space-between;margin-top:12px;padding:9px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface-subtle);color:var(--text-primary);font:inherit;font-size:.7rem;font-weight:750;cursor:pointer}.action:hover{border-color:var(--brand)}
  `],
})
export class ProductCard {
  readonly product = input.required<ProductCardModel>();
  readonly showPrice = input(true);
  readonly currency = input('₹ ');
  readonly actionLabel = input('View details');
  readonly selected = output<ProductCardModel>();

  protected primaryImage(): string | null {
    return this.product().media?.find((item) => item.media_type === 'IMAGE' && item.url)?.url ?? null;
  }

  protected primaryVideo(): string | null {
    return this.product().media?.find((item) => item.media_type === 'VIDEO' && item.url)?.url ?? null;
  }
}
