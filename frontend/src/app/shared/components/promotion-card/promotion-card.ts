import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PromotionCardModel } from '../../models/marketplace-card.models';

@Component({
  selector: 'app-promotion-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="promotion-card">
      <div class="topline"><span class="label">{{ label() }}</span>@if (promotion().valid_until) { <time [attr.datetime]="promotion().valid_until">Until {{ promotion().valid_until | date:'mediumDate' }}</time> }</div>
      <div class="business">{{ promotion().business_name }}</div>
      <h3>{{ promotion().post_title }}</h3>
      <p class="content">{{ promotion().post_content }}</p>
      @if (promotion().media?.length) {
        <div class="media-grid">
          @for (media of promotion().media; track media.id; let index = $index) {
            @if (index < mediaLimit()) {
              @if (media.url && media.media_type === 'IMAGE') {
                <img [src]="media.url" [alt]="media.original_file_name || promotion().post_title" loading="lazy">
              } @else if (media.url && media.media_type === 'VIDEO') {
                <video [src]="media.url" controls preload="metadata"></video>
              } @else if (media.url && media.media_type === 'AUDIO') {
                <audio [src]="media.url" controls></audio>
              } @else if (media.url && media.media_type === 'DOCUMENT') {
                <a class="document" [href]="media.url" target="_blank" rel="noopener noreferrer">{{ media.original_file_name || 'Open attachment' }}</a>
              }
            }
          }
        </div>
        @if (promotion().media!.length > mediaLimit()) { <p class="more-media">+{{ promotion().media!.length - mediaLimit() }} more attachments</p> }
      }
      <div class="footer">
        <time [attr.datetime]="promotion().published_on">Published {{ promotion().published_on | date:'mediumDate' }}</time>
        <button type="button" (click)="selected.emit(promotion())">View promotion <span aria-hidden="true">→</span></button>
      </div>
    </article>
  `,
  styles: [`
    :host{display:block;min-width:0}.promotion-card{position:relative;height:100%;overflow:hidden;padding:19px;border:1px solid var(--border);border-radius:13px;background:var(--surface-card);color:var(--text-primary)}.promotion-card:before{position:absolute;inset:0 0 auto;height:4px;background:var(--accent,#e6c928);content:""}.topline{display:flex;align-items:center;justify-content:space-between;gap:8px}.label{padding:6px 8px;border-radius:5px;background:var(--brand-soft);color:var(--brand-strong);font-size:.61rem;font-weight:850;letter-spacing:.07em}.topline time,.footer>time{color:var(--text-muted);font-size:.63rem}.business{margin:15px 0 5px;color:var(--brand-strong);font-size:.72rem;font-weight:750}.promotion-card h3{margin:0;font-size:1.04rem;letter-spacing:-.025em}.content{display:-webkit-box;min-height:3.8em;overflow:hidden;margin:10px 0 15px;color:var(--text-secondary);font-size:.78rem;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:3}.media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.media-grid img,.media-grid video{width:100%;max-height:190px;aspect-ratio:4/3;object-fit:cover;border-radius:7px;background:#111}.media-grid audio{grid-column:1/-1;width:100%}.document{display:flex;min-height:48px;align-items:center;padding:9px;border:1px solid var(--border);border-radius:7px;color:var(--brand-strong);font-size:.68rem;overflow-wrap:anywhere}.more-media{margin:7px 0 0;color:var(--text-muted);font-size:.65rem}.footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:15px;padding-top:12px;border-top:1px solid var(--border)}.footer button{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface-subtle);color:var(--text-primary);font:inherit;font-size:.68rem;font-weight:750;cursor:pointer}
  `],
  imports: [DatePipe],
})
export class PromotionCard {
  readonly promotion = input.required<PromotionCardModel>();
  readonly label = input('BBG PROMOTION');
  readonly mediaLimit = input(4);
  readonly selected = output<PromotionCardModel>();
}
