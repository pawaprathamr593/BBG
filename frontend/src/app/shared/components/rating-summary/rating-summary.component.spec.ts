import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RatingSummaryComponent } from './rating-summary.component';
import { ProductRatingSummary } from '../../../core/reviews/product-review.models';

describe('RatingSummaryComponent', () => {
  let component: RatingSummaryComponent;
  let fixture: ComponentFixture<RatingSummaryComponent>;

  const mockSummary: ProductRatingSummary = {
    product_id: 101,
    average_rating: 4.5,
    total_reviews: 20,
    distribution: {
      5: { count: 12, percentage: 60 },
      4: { count: 6, percentage: 30 },
      3: { count: 2, percentage: 10 },
      2: { count: 0, percentage: 0 },
      1: { count: 0, percentage: 0 },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingSummaryComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('summary', mockSummary);
    fixture.detectChanges();
  });

  it('should create the rating summary component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the average rating score', () => {
    const scoreEl = fixture.nativeElement.querySelector('.score-figure');
    expect(scoreEl.textContent.trim()).toBe('4.5');
  });

  it('should render 5 distribution bar rows', () => {
    const bars = fixture.nativeElement.querySelectorAll('.star-bar-row');
    expect(bars.length).toBe(5);
  });

  it('should emit starFilterChange when a bar is clicked', () => {
    let filteredStar: number | null = null;
    component.starFilterChange.subscribe((val) => {
      filteredStar = val;
    });

    const fiveStarBar = fixture.nativeElement.querySelectorAll(
      '.star-bar-row',
    )[0] as HTMLButtonElement;
    fiveStarBar.click();

    expect(filteredStar).toBe(5);
  });
});
