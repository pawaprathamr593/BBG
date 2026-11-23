import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProductReviewsComponent } from './product-reviews.component';
import { ProductReviewApiService } from '../../../core/reviews/product-review-api.service';
import { ProductReview } from '../../../core/reviews/product-review.models';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthDialogService } from '../../../core/auth/auth-dialog.service';
import { S3UploadService } from '../../../core/storage/s3-upload.service';

describe('ProductReviewsComponent', () => {
  let component: ProductReviewsComponent;
  let fixture: ComponentFixture<ProductReviewsComponent>;

  const mockApiService = {
    getProductReviews: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        msgArr: [],
        data: {
          items: [
            {
              id: 1,
              tenant_id: 1,
              product_id: 42,
              business_id: 1,
              user_id: 10,
              author_name: 'Rajesh Sharma',
              rating: 5,
              review_title: 'Exceptional Quality',
              review_text: 'Solid commercial material and fast delivery.',
              review_status: 'PUBLISHED',
              is_verified_purchase: false,
              helpful_count: 4,
              reviewed_on: '2026-11-20T10:00:00Z',
              user_voted_helpful: false,
              is_author: false,
              media: [],
            },
          ],
          pagination: {
            page: 1,
            page_size: 10,
            total_count: 1,
            total_pages: 1,
          },
        },
      }),
    ),
    getProductRatingSummary: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        msgArr: [],
        data: {
          product_id: 42,
          average_rating: 5.0,
          total_reviews: 1,
          distribution: {
            5: { count: 1, percentage: 100 },
            4: { count: 0, percentage: 0 },
            3: { count: 0, percentage: 0 },
            2: { count: 0, percentage: 0 },
            1: { count: 0, percentage: 0 },
          },
        },
      }),
    ),
    voteHelpful: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        msgArr: [],
        data: { review_id: 1, user_voted_helpful: true, helpful_count: 5 },
      }),
    ),
    createReview: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        msgArr: ['Product review submitted successfully.'],
        data: { id: 2 },
      }),
    ),
    getReviewMediaUploadUrl: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        msgArr: [],
        data: {
          upload_url: 'https://s3.example.com/upload',
          object_key: 'tenants/1/reviews/42/99/test.webp',
          expires_in: 600,
          required_headers: { 'Content-Type': 'image/webp' },
        },
      }),
    ),
    updateReview: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        msgArr: ['Review updated successfully.'],
        data: { id: 1 },
      }),
    ),
  };

  const mockS3UploadService = {
    upload: vi.fn().mockResolvedValue(undefined),
  };

  const mockAuthService = {
    isAuthenticated: vi.fn().mockReturnValue(true),
    user: vi.fn().mockReturnValue({ id: 99, full_name: 'Test User' }),
    errorMessage: vi.fn(
      (err: unknown) =>
        (err as { error?: { msgArr?: string[] }; message?: string })?.error?.msgArr?.[0] ??
        (err as { message?: string })?.message ??
        'Request failed',
    ),
  };

  const mockAuthDialogService = {
    requireAuthentication: vi.fn((reason, anchor, action) => action()),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductReviewsComponent],
      providers: [
        { provide: ProductReviewApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthDialogService, useValue: mockAuthDialogService },
        { provide: S3UploadService, useValue: mockS3UploadService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductReviewsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('productId', 42);
    fixture.componentRef.setInput('productName', 'Heavy Duty Brass Valve');
  });

  it('should create product reviews component', () => {
    expect(component).toBeTruthy();
  });

  it('should load reviews and summary on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    expect(mockApiService.getProductReviews).toHaveBeenCalledWith(42, 1, 10, 'NEWEST');
    expect(mockApiService.getProductRatingSummary).toHaveBeenCalledWith(42);
  });

  it('should render customer review card', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();

    const authorEl = fixture.nativeElement.querySelector('.reviewer-name');
    expect(authorEl).not.toBeNull();
    expect(authorEl?.textContent.trim()).toBe('Rajesh Sharma');

    const titleEl = fixture.nativeElement.querySelector('.review-headline');
    expect(titleEl?.textContent.trim()).toBe('Exceptional Quality');
  });

  it('should surface backend error messages cleanly when review submission fails', async () => {
    mockApiService.createReview.mockReturnValueOnce(
      throwError(() => ({
        status: 400,
        error: { status: 'FAILED', msgArr: ['You have already reviewed this product.'] },
      })),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const writeBtn = fixture.nativeElement.querySelector('.btn-write-review') as HTMLButtonElement;
    writeBtn.click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector(
      '#review-text-input',
    ) as HTMLTextAreaElement;
    textarea.value = 'Great durable brass valve for commercial plumbing.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector('.btn-submit') as HTMLButtonElement;
    submitBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.alert-error');
    expect(errorEl?.textContent).toContain('You have already reviewed this product.');
  });

  it('should upload photo attachment to S3 when user selects an image file', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const writeBtn = fixture.nativeElement.querySelector('.btn-write-review') as HTMLButtonElement;
    writeBtn.click();
    fixture.detectChanges();

    const fileInput = fixture.nativeElement.querySelector('.hidden-file-input') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const testFile = new File(['fake-image-bytes'], 'valve-photo.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
    });

    fileInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockApiService.getReviewMediaUploadUrl).toHaveBeenCalledWith(42, testFile);
    expect(mockS3UploadService.upload).toHaveBeenCalledWith(
      'https://s3.example.com/upload',
      testFile,
      { 'Content-Type': 'image/webp' },
      expect.any(Function),
    );

    const textarea = fixture.nativeElement.querySelector(
      '#review-text-input',
    ) as HTMLTextAreaElement;
    textarea.value = 'Awesome valve with photo proof.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector('.btn-submit') as HTMLButtonElement;
    submitBtn.click();
    await fixture.whenStable();

    expect(mockApiService.createReview).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 42,
        media: [
          {
            media_url: 'tenants/1/reviews/42/99/test.webp',
            file_name: 'valve-photo.png',
          },
        ],
      }),
    );
  });

  it('should display review media thumbnails in edit mode and save remaining media when deleted', async () => {
    const reviewWithMedia: ProductReview = {
      id: 99,
      tenant_id: 1,
      product_id: 42,
      business_id: 1,
      user_id: 10,
      author_name: 'Rajesh Sharma',
      rating: 5,
      review_title: 'Great valve',
      review_text: 'Good build quality overall.',
      review_status: 'PUBLISHED',
      is_verified_purchase: true,
      helpful_count: 2,
      reviewed_on: '2026-11-20T10:00:00Z',
      user_voted_helpful: false,
      is_author: true,
      media: [
        { id: 101, media_url: 'https://example.com/photo1.jpg', file_name: 'Photo 1' },
        { id: 102, media_url: 'https://example.com/photo2.jpg', file_name: 'Photo 2' },
      ],
    };

    mockApiService.getProductReviews.mockReturnValueOnce(
      of({
        status: 'SUCCESS',
        msgArr: [],
        data: {
          items: [reviewWithMedia],
          pagination: { page: 1, page_size: 10, total_count: 1, total_pages: 1 },
        },
      }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();

    component['startEditing'](reviewWithMedia);
    fixture.detectChanges();

    expect(component['editMedia']().length).toBe(2);
    const editThumbs = fixture.nativeElement.querySelectorAll('.edit-thumb-item');
    expect(editThumbs.length).toBe(2);

    // Delete first image
    const removeBtn = editThumbs[0].querySelector('.btn-remove-thumb') as HTMLButtonElement;
    removeBtn.click();
    fixture.detectChanges();

    expect(component['editMedia']().length).toBe(1);
    expect(component['editMedia']()[0].id).toBe(102);

    // Save edit
    await component['saveEdit'](99);
    expect(mockApiService.updateReview).toHaveBeenCalledWith(
      expect.objectContaining({
        review_id: 99,
        media: [
          expect.objectContaining({
            id: 102,
            media_url: 'https://example.com/photo2.jpg',
          }),
        ],
      }),
    );
  });
});
