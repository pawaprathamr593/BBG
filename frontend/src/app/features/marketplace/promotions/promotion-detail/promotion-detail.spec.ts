import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PromotionDetail } from './promotion-detail';
import { MarketplaceApiService } from '../../../../core/marketplace/marketplace-api.service';
import { EngagementApiService } from '../../../../core/engagement/engagement-api.service';
import { AuthDialogService } from '../../../../core/auth/auth-dialog.service';

describe('PromotionDetail', () => {
  let component: PromotionDetail;
  let fixture: ComponentFixture<PromotionDetail>;

  const mockPromotionData = {
    promotion: {
      id: 201,
      tenant_id: 15,
      post_title: 'Mega Year-End Clearance Sale',
      post_content:
        'Huge discounts on all industrial tools, fasteners, and heavy machinery. Visit our showroom or browse products online.',
      published_on: '2026-11-20T09:00:00Z',
      valid_until: '2026-12-31T23:59:59Z',
      business_name: 'Metro Fasteners & Machinery',
      business_slug: 'metro-fasteners',
      logo_path: null,
      category_name: 'Machinery & Tools',
      city: 'Bengaluru',
      state: 'Karnataka',
      hashtags: ['Clearance', 'IndustrialSale'],
    },
    media: [
      {
        id: 10,
        media_type: 'IMAGE' as const,
        url: 'https://example.com/promo-hero.jpg',
        original_file_name: 'promo-hero.jpg',
        display_order: 0,
        is_primary: 1,
      },
      {
        id: 11,
        media_type: 'DOCUMENT' as const,
        url: 'https://example.com/brochure.pdf',
        original_file_name: 'brochure.pdf',
        display_order: 1,
      },
    ],
  };

  const mockMarketplaceApi = {
    getPublicPromotion: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        data: mockPromotionData,
      }),
    ),
  };

  const mockEngagementApi = {
    getEngagementSummary: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        data: {
          content_type: 'POST',
          content_id: 201,
          total_likes: 12,
          total_comments: 5,
          total_views: 90,
          user_reaction: null,
          reactions: { LIKE: 12, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 },
        },
      }),
    ),
    getComments: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        data: { items: [], pagination: { page: 1, page_size: 10, total_count: 5 } },
      }),
    ),
    reportContent: vi.fn().mockReturnValue(of({ status: 'SUCCESS', data: { id: 99 } })),
  };

  const mockAuthDialog = {
    requireAuthentication: vi.fn(
      (_prompt: string, _anchor: HTMLElement | null, cb: () => void | Promise<void>) => cb(),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PromotionDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '201' : null),
              },
              fragment: 'comments',
            },
          },
        },
        { provide: MarketplaceApiService, useValue: mockMarketplaceApi },
        { provide: EngagementApiService, useValue: mockEngagementApi },
        { provide: AuthDialogService, useValue: mockAuthDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PromotionDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create promotion detail component', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch promotion details on init using route id', () => {
    expect(mockMarketplaceApi.getPublicPromotion).toHaveBeenCalledWith(201);
    expect(component.promotion()?.post_title).toBe('Mega Year-End Clearance Sale');
  });

  it('should select primary image as initial activeMedia', () => {
    const active = component.activeMedia();
    expect(active).toBeTruthy();
    expect(active?.id).toBe(10);
    expect(active?.url).toBe('https://example.com/promo-hero.jpg');
  });

  it('should render title, description, schedule, and business sidebar info', () => {
    const titleEl = fixture.nativeElement.querySelector('.promotion-title');
    expect(titleEl?.textContent).toContain('Mega Year-End Clearance Sale');

    const contentEl = fixture.nativeElement.querySelector('.content-paragraph');
    expect(contentEl?.textContent).toContain('Huge discounts on all industrial tools');

    const brandName = fixture.nativeElement.querySelector('.brand-name');
    expect(brandName?.textContent).toContain('Metro Fasteners & Machinery');

    const storefrontLink = fixture.nativeElement.querySelector('.btn-visit-storefront');
    expect(storefrontLink?.getAttribute('href')).toBe('/store/metro-fasteners');
  });

  it('should render secondary gallery thumbnails and switch active media on click', () => {
    const thumbBtns = fixture.nativeElement.querySelectorAll('.gallery-thumbnail-btn');
    expect(thumbBtns.length).toBe(2);

    // Click secondary document thumbnail
    thumbBtns[1].click();
    fixture.detectChanges();

    expect(component.activeMedia()?.id).toBe(11);
    expect(component.activeMedia()?.media_type).toBe('DOCUMENT');
  });

  it('should render dedicated comments section containing engagement component', () => {
    const commentsContainer = fixture.nativeElement.querySelector('#comments');
    expect(commentsContainer).toBeTruthy();

    const engagementComp = commentsContainer.querySelector('app-promotion-engagement');
    expect(engagementComp).toBeTruthy();
  });

  it('should handle bookmark save toggle', () => {
    localStorage.removeItem('bbg_saved_promotions_v1');
    const saveBtn = fixture.nativeElement.querySelector('.btn-save') as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();

    saveBtn.click();
    fixture.detectChanges();
    expect(component['isSaved']()).toBe(true);
    expect(saveBtn.classList.contains('saved')).toBe(true);

    saveBtn.click();
    fixture.detectChanges();
    expect(component['isSaved']()).toBe(false);
  });

  it('should render error state when promotion API fails', async () => {
    mockMarketplaceApi.getPublicPromotion.mockReturnValueOnce(
      throwError(() => new Error('Network error')),
    );

    const errFixture = TestBed.createComponent(PromotionDetail);
    errFixture.detectChanges();
    await errFixture.whenStable();
    errFixture.detectChanges();

    expect(errFixture.componentInstance.error()).toBeTruthy();
    const errorBanner = errFixture.nativeElement.querySelector('.error-banner');
    expect(errorBanner).toBeTruthy();
  });
});
