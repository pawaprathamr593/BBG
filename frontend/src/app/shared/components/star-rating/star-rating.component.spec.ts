import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StarRatingComponent } from './star-rating.component';

describe('StarRatingComponent', () => {
  let component: StarRatingComponent;
  let fixture: ComponentFixture<StarRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rating', 4);
    fixture.componentRef.setInput('maxRating', 5);
    fixture.detectChanges();
  });

  it('should create the star rating component', () => {
    expect(component).toBeTruthy();
  });

  it('should render 5 stars', () => {
    const stars = fixture.nativeElement.querySelectorAll('.star-btn');
    expect(stars.length).toBe(5);
  });

  it('should show 4 active stars when rating is 4', () => {
    const activeStars = fixture.nativeElement.querySelectorAll('.star-btn.active');
    expect(activeStars.length).toBe(4);
  });

  it('should emit ratingChange when interactive and clicked', () => {
    fixture.componentRef.setInput('interactive', true);
    fixture.detectChanges();

    let selectedRating = 0;
    component.ratingChange.subscribe((val) => {
      selectedRating = val;
    });

    const thirdStar = fixture.nativeElement.querySelectorAll('.star-btn')[2] as HTMLButtonElement;
    thirdStar.click();

    expect(selectedRating).toBe(3);
  });

  it('should not emit ratingChange when not interactive', () => {
    fixture.componentRef.setInput('interactive', false);
    fixture.detectChanges();

    let called = false;
    component.ratingChange.subscribe(() => {
      called = true;
    });

    const thirdStar = fixture.nativeElement.querySelectorAll('.star-btn')[2] as HTMLButtonElement;
    thirdStar.click();

    expect(called).toBe(false);
  });
});
