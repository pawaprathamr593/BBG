import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PromotionCard } from './promotion-card';
import type { PromotionCardModel } from '../../models/marketplace-card.models';
import { EngagementApiService } from '../../../core/engagement/engagement-api.service';
import { AuthDialogService } from '../../../core/auth/auth-dialog.service';
import { of } from 'rxjs';

describe('PromotionCard', () => {
  let component: PromotionCard;
  let fixture: ComponentFixture<PromotionCard>;

  const mockPromotion: PromotionCardModel = {
    id: 101,
    post_title: 'Enterprise Bulk Purchase Offer',
    post_content:
      'Exclusive holiday discount for verified business members across industrial hardware and electrical supplies. Order directly or connect with our support team.',
    published_on: '2026-11-15T10:00:00Z',
    valid_until: '2026-12-31T23:59:59Z',
    business_name: 'Apex Industrial Solutions',
    business_slug: 'apex-industrial-solutions',
    logo_path: null,
    category_name: 'Industrial Supplies',
    city: 'Pune',
    state: 'Maharashtra',
    media: [
      {
        id: 1,
        media_type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
        original_file_name: 'industrial-hero.jpg',
      },
    ],
  };

  const mockEngagementApi = {
    getEngagementSummary: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        data: {
          content_type: 'POST',
          content_id: 101,
          total_likes: 8,
          total_comments: 2,
          total_views: 40,
          user_reaction: null,
          reactions: { LIKE: 8, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 },
        },
      }),
    ),
    getComments: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        data: { items: [], pagination: { page: 1, page_size: 10, total_count: 0 } },
      }),
    ),
    reportContent: vi.fn().mockReturnValue(of({ status: 'SUCCESS', data: { id: 9 } })),
  };

  const mockAuthDialog = {
    requireAuthentication: vi.fn(
      (_prompt: string, _anchor: HTMLElement | null, cb: () => void | Promise<void>) => cb(),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PromotionCard],
      providers: [
        provideRouter([]),
        { provide: EngagementApiService, useValue: mockEngagementApi },
        { provide: AuthDialogService, useValue: mockAuthDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PromotionCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('promotion', mockPromotion);
    fixture.detectChanges();
  });

  it('should create promotion card', () => {
    expect(component).toBeTruthy();
  });

  it('should render exactly ONE engagement component (no duplicate action bar)', () => {
    const engagementElements = fixture.nativeElement.querySelectorAll('app-promotion-engagement');
    expect(engagementElements.length).toBe(1);
  });

  it('should display business monogram, name, category, location, and visible report icon (no 3-dot menu)', () => {
    const monogram = fixture.nativeElement.querySelector('.business-monogram');
    expect(monogram.textContent.trim()).toBe('AI');

    const businessLink = fixture.nativeElement.querySelector('.business-name-link');
    expect(businessLink.textContent).toContain('Apex Industrial Solutions');

    const metaSubline = fixture.nativeElement.querySelector('.post-meta-subline');
    expect(metaSubline.textContent).toContain('Industrial Supplies');
    expect(metaSubline.textContent).toContain('Pune, Maharashtra');

    const reportBtn = fixture.nativeElement.querySelector('.btn-report-post') as HTMLButtonElement;
    expect(reportBtn).toBeTruthy();
    expect(reportBtn.getAttribute('aria-label')).toContain('Report');
  });

  it('should open report panel and submit report via EngagementApiService', async () => {
    const reportBtn = fixture.nativeElement.querySelector('.btn-report-post') as HTMLButtonElement;
    reportBtn.click();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.report-post-panel');
    expect(panel).toBeTruthy();

    const submitBtn = fixture.nativeElement.querySelector(
      '.btn-report-submit',
    ) as HTMLButtonElement;
    submitBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockEngagementApi.reportContent).toHaveBeenCalledWith({
      content_type: 'POST',
      content_id: 101,
      report_reason: 'MISLEADING',
      report_details: null,
    });
  });

  it('should render post without media cleanly and emit selected on CTA click', () => {
    fixture.componentRef.setInput('promotion', { ...mockPromotion, media: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.card-media-section')).toBeNull();

    const emitted: PromotionCardModel[] = [];
    component.selected.subscribe((val) => {
      emitted.push(val);
    });

    const ctaBtn = fixture.nativeElement.querySelector('.btn-view-promotion') as HTMLButtonElement;
    ctaBtn.click();

    expect(emitted.length).toBe(1);
    expect(emitted[0].id).toBe(101);
  });

  it('should render standalone BBG Promotion badge, campaign dates bar, bookmark toggle, multi-media badge, and no three-dot or edit/delete menu', () => {
    localStorage.removeItem('bbg_saved_promotions_v1');
    fixture.componentRef.setInput('promotion', {
      ...mockPromotion,
      media: [
        ...mockPromotion.media!,
        {
          id: 2,
          media_type: 'IMAGE',
          url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee159',
          original_file_name: 'industrial-2.jpg',
        },
      ],
    });
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.card-top-bar .promotion-badge');
    expect(badge?.textContent?.toUpperCase()).toContain('BBG PROMOTION');

    const datesBar = fixture.nativeElement.querySelector('.campaign-dates-bar');
    expect(datesBar).toBeTruthy();

    const multiMediaBadge = fixture.nativeElement.querySelector('.multi-media-badge');
    expect(multiMediaBadge?.textContent).toContain('2 photos');

    const saveBtn = fixture.nativeElement.querySelector('.btn-save-post') as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    expect(saveBtn.getAttribute('aria-pressed')).toBe('false');

    saveBtn.click();
    fixture.detectChanges();
    expect(saveBtn.getAttribute('aria-pressed')).toBe('true');

    // No three-dot / edit / delete controls in public promotion card
    expect(fixture.nativeElement.querySelector('.btn-more-menu')).toBeNull();
    const allButtonsText = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.card-top-bar button, .card-header button'),
    )
      .map((btn) => btn.textContent?.trim().toLowerCase() ?? '')
      .join(' ');
    expect(allButtonsText).not.toContain('edit');
    expect(allButtonsText).not.toContain('delete');
  });
});
