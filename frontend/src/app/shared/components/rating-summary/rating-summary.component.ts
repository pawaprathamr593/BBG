import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProductRatingSummary } from '../../../core/reviews/product-review.models';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'app-rating-summary',
  standalone: true,
  imports: [DecimalPipe, StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rating-summary.component.html',
  styleUrl: './rating-summary.component.scss',
})
export class RatingSummaryComponent {
  readonly summary = input.required<ProductRatingSummary>();
  readonly selectedStar = input<number | null>(null);

  readonly starFilterChange = output<number | null>();

  protected readonly starLevels = [5, 4, 3, 2, 1] as const;

  protected onSelectStar(star: number): void {
    if (this.selectedStar() === star) {
      this.starFilterChange.emit(null);
    } else {
      this.starFilterChange.emit(star);
    }
  }

  protected clearFilter(): void {
    this.starFilterChange.emit(null);
  }
}
