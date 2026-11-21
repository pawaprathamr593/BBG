import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PromotionEngagementComponent } from './promotion-engagement.component';
import { EngagementApiService } from '../../../core/engagement/engagement-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthDialogService } from '../../../core/auth/auth-dialog.service';

describe('PromotionEngagementComponent', () => {
  let component: PromotionEngagementComponent;
  let fixture: ComponentFixture<PromotionEngagementComponent>;

  const mockSummary = {
    total_likes: 15,
    user_reaction: 'LOVE' as const,
    reactions: { LIKE: 10, LOVE: 5, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 },
    total_comments: 3,
    total_views: 120,
  };

  const mockComments = [
    {
      id: 1,
      tenant_id: 5,
      user_id: 10,
      author_name: 'Vikram Patel',
      parent_comment_id: null,
      comment_text: 'Is bulk delivery included?',
      commented_on: '2026-11-18T10:00:00Z',
      is_author: false,
    },
    {
      id: 2,
      tenant_id: 5,
      user_id: 11,
      author_name: 'Merchant Desk',
      parent_comment_id: 1,
      comment_text: 'Yes, free pan-India shipping above ₹50,000.',
      commented_on: '2026-11-18T11:00:00Z',
      is_author: true,
    },
  ];

  const mockEngagementApi = {
    getEngagementSummary: vi.fn(),
    getComments: vi.fn(),
    toggleReaction: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    reportContent: vi.fn(),
  };

  const mockAuth = {
    isAuthenticated: vi.fn().mockReturnValue(true),
  };

  const mockAuthDialog = {
    requireAuthentication: vi.fn(
      (_prompt: string, _anchor: HTMLElement | null, cb: () => void | Promise<void>) => cb(),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEngagementApi.getEngagementSummary.mockReturnValue(
      of({ status: 'SUCCESS', data: mockSummary }),
    );
    mockEngagementApi.getComments.mockReturnValue(
      of({
        status: 'SUCCESS',
        data: {
          items: mockComments,
          pagination: { page: 1, page_size: 10, total_count: 3 },
        },
      }),
    );
    mockEngagementApi.createComment.mockReturnValue(of({ status: 'SUCCESS', data: { id: 3 } }));

    await TestBed.configureTestingModule({
      imports: [PromotionEngagementComponent],
      providers: [
        { provide: EngagementApiService, useValue: mockEngagementApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: AuthDialogService, useValue: mockAuthDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PromotionEngagementComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('postId', 88);
    fixture.componentRef.setInput('postTitle', 'Winter B2B Promotion');
    await component.ngOnInit();
    fixture.detectChanges();
  });

  it('should create promotion engagement component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the total likes, user reaction state, and metrics summary', () => {
    const likeBtn = fixture.nativeElement.querySelector('.btn-reaction') as HTMLButtonElement;
    expect(likeBtn.classList.contains('reacted')).toBe(true);
    expect(likeBtn.textContent).toContain('Loved');
    const metricsCount = fixture.nativeElement.querySelector('.metrics-count');
    expect(metricsCount.textContent).toContain('15');
  });

  it('should render threaded comments, replies, and Load more button', async () => {
    const commentBtn = fixture.nativeElement.querySelector('.btn-comment') as HTMLButtonElement;
    commentBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('.expanded-comments-drawer');
    expect(drawer).toBeTruthy();
    expect(mockEngagementApi.getComments).toHaveBeenCalledWith('POST', 88, 1, 10);

    const replies = fixture.nativeElement.querySelectorAll('.reply-item');
    expect(replies.length).toBe(1);
    expect(replies[0].textContent).toContain('Yes, free pan-India shipping');

    const loadMoreBtn = fixture.nativeElement.querySelector(
      '.btn-load-more-comments',
    ) as HTMLButtonElement;
    expect(loadMoreBtn).toBeTruthy();
  });

  it('should submit a nested reply with parent_comment_id', async () => {
    const commentBtn = fixture.nativeElement.querySelector('.btn-comment') as HTMLButtonElement;
    commentBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const replyBtn = fixture.nativeElement.querySelector('.btn-reply-comment') as HTMLButtonElement;
    replyBtn.click();
    fixture.detectChanges();

    const indicator = fixture.nativeElement.querySelector('.replying-indicator');
    expect(indicator.textContent).toContain('Vikram Patel');

    const inputEl = fixture.nativeElement.querySelector('.composer-text-input') as HTMLInputElement;
    inputEl.value = 'Thanks for confirming!';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const sendBtn = fixture.nativeElement.querySelector('.btn-send-comment') as HTMLButtonElement;
    sendBtn.click();
    await fixture.whenStable();

    expect(mockEngagementApi.createComment).toHaveBeenCalledWith({
      content_type: 'POST',
      content_id: 88,
      comment_text: 'Thanks for confirming!',
      parent_comment_id: 1,
    });
  });

  it('should toggle comment-level like independently without altering post-level summary', async () => {
    mockEngagementApi.toggleReaction.mockReturnValue(
      of({ status: 'SUCCESS', data: { liked: true, reaction_type: 'LIKE', total_likes: 1 } }),
    );

    const commentBtn = fixture.nativeElement.querySelector('.btn-comment') as HTMLButtonElement;
    commentBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const postMetricsBefore =
      fixture.nativeElement.querySelector('.metrics-count')?.textContent?.trim() ?? '';
    const postReactionBefore =
      fixture.nativeElement.querySelector('.btn-reaction')?.textContent?.trim() ?? '';

    const likeCommentBtn = fixture.nativeElement.querySelector(
      '.btn-like-comment',
    ) as HTMLButtonElement;
    likeCommentBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockEngagementApi.toggleReaction).toHaveBeenCalledWith({
      content_type: 'COMMENT',
      content_id: 1,
      reaction_type: 'LIKE',
    });
    expect(fixture.nativeElement.querySelector('.metrics-count')?.textContent?.trim()).toBe(
      postMetricsBefore,
    );
    expect(fixture.nativeElement.querySelector('.btn-reaction')?.textContent?.trim()).toBe(
      postReactionBefore,
    );
    expect(likeCommentBtn.textContent).toContain('Liked');
    expect(likeCommentBtn.textContent).toContain('(1)');
  });
});
