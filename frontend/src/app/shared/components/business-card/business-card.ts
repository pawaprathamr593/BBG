import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { BusinessCardModel } from '../../models/marketplace-card.models';

@Component({
  selector: 'app-business-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="business-card">
      <div class="cover" [style.backgroundImage]="business().cover_image_path ? 'url(' + business().cover_image_path + ')' : null">
        <div class="identity">
          @if (business().logo_path) {
            <img class="logo" [src]="business().logo_path" [alt]="business().business_name + ' logo'" loading="lazy">
          } @else {
            <span class="logo-fallback" aria-hidden="true">{{ business().business_name.slice(0, 1).toUpperCase() }}</span>
          }
        </div>
        @if (business().category_name) { <span class="category">{{ business().category_name }}</span> }
      </div>
      <div class="body">
        <div class="title-row">
          <h3>{{ business().business_name }}</h3>
          @if (business().rank) { <span class="rank">#{{ business().rank }}</span> }
        </div>
        @if (business().city || business().state) {
          <p class="location">{{ business().city }}{{ business().city && business().state ? ', ' : '' }}{{ business().state }}</p>
        }
        @if (business().business_description) {
          <p class="description">{{ business().business_description }}</p>
        }
        <div class="features">
          @if (business().accept_online_orders) { <span>Online orders</span> }
          @if (business().whatsapp_enabled) { <span>WhatsApp</span> }
        </div>
        <button type="button" class="action" (click)="selected.emit(business())">
          Explore business <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  `,
  styles: [`
    :host{display:block;min-width:0}.business-card{height:100%;overflow:hidden;border:1px solid var(--border);border-radius:14px;background:var(--surface-card);color:var(--text-primary);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.business-card:hover{transform:translateY(-3px);border-color:var(--brand);box-shadow:0 12px 28px #1d392510}.cover{position:relative;display:flex;height:112px;align-items:flex-end;padding:0 16px;background-color:var(--brand-soft);background-position:center;background-size:cover}.cover:before{position:absolute;inset:0;background:linear-gradient(0deg,#102c1db8,transparent 80%);content:""}.identity{position:relative;z-index:1;transform:translateY(25px)}.logo,.logo-fallback{display:grid;width:62px;height:62px;place-items:center;border:3px solid var(--surface-card);border-radius:15px;background:var(--surface-card);object-fit:cover}.logo-fallback{color:var(--brand-strong);font-size:1.4rem;font-weight:800}.category{position:absolute;right:13px;bottom:12px;max-width:55%;overflow:hidden;padding:6px 9px;border:1px solid #ffffff55;border-radius:999px;background:#102c1d99;color:#fff;font-size:.65rem;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.body{padding:36px 16px 16px}.title-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.title-row h3{overflow:hidden;margin:0;font-size:1rem;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.rank{flex:0 0 auto;color:var(--brand-strong);font-size:.7rem;font-weight:800}.location{margin:6px 0 0;color:var(--text-secondary);font-size:.72rem}.description{display:-webkit-box;min-height:3.5em;overflow:hidden;margin:12px 0;color:var(--text-secondary);font-size:.77rem;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:3}.features{display:flex;flex-wrap:wrap;gap:6px}.features span{padding:5px 8px;border-radius:6px;background:var(--brand-soft);color:var(--brand-strong);font-size:.64rem;font-weight:700}.action{display:flex;width:100%;align-items:center;justify-content:space-between;margin-top:15px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-subtle);color:var(--text-primary);font:inherit;font-size:.73rem;font-weight:750;cursor:pointer}.action:hover{border-color:var(--brand)}
  `],
})
export class BusinessCard {
  readonly business = input.required<BusinessCardModel>();
  readonly selected = output<BusinessCardModel>();
}
