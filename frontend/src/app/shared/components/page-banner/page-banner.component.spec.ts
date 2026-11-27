import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageBannerComponent } from './page-banner.component';

describe('PageBannerComponent', () => {
  let fixture: ComponentFixture<PageBannerComponent>;
  let component: PageBannerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageBannerComponent);
    component = fixture.componentInstance;
  });

  it('renders title, accent text, eyebrow and description', () => {
    fixture.componentRef.setInput('title', 'Discover');
    fixture.componentRef.setInput('titleAccent', 'businesses');
    fixture.componentRef.setInput('eyebrow', 'THE BBG COMMUNITY');
    fixture.componentRef.setInput('description', 'Find businesses and connect direct.');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const titleText = el.querySelector('.banner-title')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(titleText).toContain('Discover businesses');
    expect(el.querySelector('.accent-text')?.textContent?.trim()).toBe('businesses');
    expect(el.querySelector('.banner-eyebrow')?.textContent).toContain('THE BBG COMMUNITY');
    expect(el.querySelector('.banner-description')?.textContent).toContain(
      'Find businesses and connect direct.',
    );
  });

  it('applies compact variant class when requested', () => {
    fixture.componentRef.setInput('title', 'Dashboard Overview');
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    const bannerEl = fixture.nativeElement.querySelector('.bbg-page-banner');
    expect(bannerEl.classList.contains('banner-compact')).toBe(true);
    expect(bannerEl.classList.contains('banner-discovery')).toBe(false);
  });

  it('renders chips when provided', () => {
    fixture.componentRef.setInput('title', 'Explore');
    fixture.componentRef.setInput('chips', [
      { label: 'Retail', count: 12, active: true },
      { label: 'Services', count: 5 },
    ]);
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('.banner-chip');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('Retail (12)');
    expect(chips[0].classList.contains('is-active')).toBe(true);
  });
});
