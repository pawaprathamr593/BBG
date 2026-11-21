import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  protected readonly Math = Math;
  readonly rating = input<number>(0);
  readonly maxRating = input<number>(5);
  readonly interactive = input<boolean>(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly showValue = input<boolean>(false);

  readonly ratingChange = output<number>();

  protected readonly hoverRating = signal<number | null>(null);

  protected readonly stars = computed(() => {
    const max = this.maxRating();
    return Array.from({ length: max }, (_, i) => i + 1);
  });

  protected readonly displayRating = computed(() => {
    const hover = this.hoverRating();
    if (hover !== null && this.interactive()) {
      return hover;
    }
    return this.rating();
  });

  protected setHover(star: number): void {
    if (this.interactive()) {
      this.hoverRating.set(star);
    }
  }

  protected clearHover(): void {
    if (this.interactive()) {
      this.hoverRating.set(null);
    }
  }

  protected selectStar(star: number): void {
    if (this.interactive()) {
      this.ratingChange.emit(star);
    }
  }

  protected onKeyDown(event: KeyboardEvent, star: number): void {
    if (!this.interactive()) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectStar(star);
    } else if (event.key === 'ArrowRight' && star < this.maxRating()) {
      event.preventDefault();
      this.selectStar(star + 1);
    } else if (event.key === 'ArrowLeft' && star > 1) {
      event.preventDefault();
      this.selectStar(star - 1);
    }
  }

  protected getStarFillPercentage(starIndex: number): number {
    const current = this.displayRating();
    if (current >= starIndex) {
      return 100;
    }
    if (current > starIndex - 1) {
      return Math.round((current - (starIndex - 1)) * 100);
    }
    return 0;
  }
}
