import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessSubscriptionManagement } from './business-subscription-management';
import { AuthService } from '../../core/auth/auth.service';
import {
  ApplicationSubscription,
  BusinessRegistrationApiService,
  SubscriptionPlan,
} from '../../core/business/business-registration-api.service';

describe('BusinessSubscriptionManagement — RBAC, Entitlements & Drawer Flow', () => {
  let component: BusinessSubscriptionManagement;
  let fixture: ComponentFixture<BusinessSubscriptionManagement>;
  let mockAuth: Partial<AuthService>;
  let mockApi: Partial<BusinessRegistrationApiService>;
  let mockRouter: Partial<Router>;

  const mockActiveSubscription: ApplicationSubscription = {
    id: 10,
    tenant_id: 201,
    plan_id: 2,
    plan_name: 'Growth Merchant Plan',
    plan_code: 'GROWTH_M',
    amount: '499.00',
    currency: 'INR',
    billing_cycle: 'MONTHLY',
    subscription_status: 'ACTIVE',
    starts_on: '2026-11-01',
    ends_on: '2026-12-01',
    bcn: 'BCN-PUN-002',
    plan_description: 'For scaling retail operations with digital storefront.',
    plan_entitlements:
      'BUSINESS_LISTING=TRUE;STOREFRONT_ACCESS=TRUE;PRODUCT_MANAGEMENT=TRUE;PRODUCT_LIMIT=50;DAILY_PROMOTION_LIMIT=3;SEO_SUGGESTIONS=FALSE;ADVANCED_ANALYTICS=0;SUPPORT_LEVEL=none',
    created_on: '2026-11-01 10:00:00',
    payment_payee_name: 'Bavdhan Business Group',
    payment_upi_id: 'payments@bbg',
    payment_qr_url: null,
    payment_instructions: 'Pay via UPI',
  };

  const mockPlans: SubscriptionPlan[] = [
    {
      id: 1,
      plan_code: 'BASIC_M',
      plan_name: 'Basic Directory Plan',
      price: '199.00',
      currency: 'INR',
      billing_cycle: 'MONTHLY',
      description: 'Standard business presence.',
      entitlements:
        'BUSINESS_LISTING=TRUE;STOREFRONT_ACCESS=0;DAILY_PROMOTION_LIMIT=0;PRODUCT_LIMIT=0;SEO_SUGGESTIONS=false',
    },
    {
      id: 2,
      plan_code: 'GROWTH_M',
      plan_name: 'Growth Merchant Plan',
      price: '499.00',
      currency: 'INR',
      billing_cycle: 'MONTHLY',
      description: 'For scaling retail operations.',
      entitlements:
        'BUSINESS_LISTING=TRUE;STOREFRONT_ACCESS=TRUE;PRODUCT_MANAGEMENT=TRUE;DAILY_PROMOTION_LIMIT=3;PRODUCT_LIMIT=50;ADVANCED_ANALYTICS=0',
    },
    {
      id: 3,
      plan_code: 'ENTERPRISE_M',
      plan_name: 'Enterprise Showcase Plan',
      price: '1499.00',
      currency: 'INR',
      billing_cycle: 'MONTHLY',
      description: 'Full capabilities for premier merchants.',
      entitlements:
        'BUSINESS_LISTING=TRUE;STOREFRONT_ACCESS=TRUE;PRODUCT_MANAGEMENT=TRUE;DAILY_PROMOTION_LIMIT=10;SEO_SUGGESTIONS=TRUE;ADVANCED_ANALYTICS=TRUE;SUPPORT_LEVEL=Priority 24/7',
    },
  ];

  beforeEach(async () => {
    mockAuth = {
      restoreSession: vi.fn().mockResolvedValue(true),
      errorMessage: vi.fn((err: unknown) => (err instanceof Error ? err.message : String(err))),
    };

    mockApi = {
      listOwnedSubscriptions: vi.fn().mockResolvedValue([mockActiveSubscription]),
      getActivePlans: vi.fn().mockResolvedValue(mockPlans),
      getCurrentApplicationSubscription: vi.fn().mockResolvedValue(null),
      getPaymentInstructions: vi.fn().mockResolvedValue({
        payment_payee_name: 'Bavdhan Business Group',
        payment_upi_id: 'payments@bbg',
        payment_qr_url: 'https://cdn.bbg.in/qr/bbg-pay.png',
        payment_instructions: 'Scan official QR code and upload receipt.',
      }),
      getSubscriptionDetail: vi.fn().mockImplementation((tenantId: number, subId: number) =>
        Promise.resolve({
          ...mockActiveSubscription,
          id: subId,
          proofs: [
            {
              id: 1,
              payment_reference: 'UTR123456789012',
              proof_file_url: 'https://cdn.bbg.in/receipts/proof-1.jpg',
              submitted_on: '2026-11-01 10:15:00',
              review_status: 'VERIFIED',
              review_notes: 'Verified via bank statement.',
            },
          ],
        }),
      ),
      requestApplicationSubscriptionRenewal: vi.fn(),
      requestApplicationSubscriptionUpgrade: vi.fn(),
      uploadApplicationPaymentProof: vi.fn().mockResolvedValue({ id: 1 }),
      cancelApplicationSubscription: vi.fn().mockResolvedValue({ cancelled: true }),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [BusinessSubscriptionManagement],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: BusinessRegistrationApiService, useValue: mockApi },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'tenant_id' ? '201' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessSubscriptionManagement);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  });

  it('restores session and redirects to login if unauthenticated (RBAC gate)', async () => {
    (mockAuth.restoreSession as any).mockResolvedValueOnce(false);
    const unauthFixture = TestBed.createComponent(BusinessSubscriptionManagement);
    const unauthComp = unauthFixture.componentInstance;
    await unauthComp.ngOnInit();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/business/subscriptions?tenant_id=201' },
    });
  });

  it('renders current active plan with validity dates and positive entitlements ONLY', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const planTitle = el.querySelector('.current-plan-card h2');
    expect(planTitle?.textContent).toContain('Growth Merchant Plan');

    // Dates line
    const datesLine = el.querySelector('.plan-dates-line');
    expect(datesLine?.textContent).toContain('Started: 2026-11-01');
    expect(datesLine?.textContent).toContain('Valid until: 2026-12-01');

    // Entitlements checklist: STRICT RULE — no 0, false, none, unavailable
    const featureItems = Array.from(
      el.querySelectorAll('.current-plan-card .features-checklist li'),
    ).map((li) => li.textContent?.trim());

    // Positive features included
    expect(featureItems.some((f) => f?.includes('Verified Business Listing'))).toBe(true);
    expect(featureItems.some((f) => f?.includes('Public Digital Storefront'))).toBe(true);
    expect(featureItems.some((f) => f?.includes('Up to 3 Promotional Posts per day'))).toBe(true);
    expect(featureItems.some((f) => f?.includes('Up to 50 Products in Catalogue'))).toBe(true);

    // Negative features strictly omitted
    expect(featureItems.some((f) => f?.toLowerCase().includes('seo'))).toBe(false);
    expect(featureItems.some((f) => f?.toLowerCase().includes('analytics'))).toBe(false);
    expect(featureItems.some((f) => f?.toLowerCase().includes('none'))).toBe(false);
    expect(featureItems.some((f) => f === '0' || f === '0.00' || f?.includes(': 0'))).toBe(false);
    expect(featureItems.some((f) => f?.toLowerCase().includes('false'))).toBe(false);
  });

  it('renders grace period countdown warning when subscription is in grace period', async () => {
    // End date was 1 day ago (within 2-day grace period)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const graceSub: ApplicationSubscription = {
      ...mockActiveSubscription,
      subscription_status: 'GRACE_PERIOD',
      ends_on: yesterday,
    };
    component.subscriptions.set([graceSub]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const graceAlert = el.querySelector('.grace-alert-box');
    expect(graceAlert).toBeTruthy();
    expect(graceAlert?.textContent).toContain('Storefront Grace Period Active');
    expect(graceAlert?.textContent).toContain('remains publicly live');
  });

  it('clicking "Renew current plan" opens the slide-over drawer WITHOUT calling backend API to create DB records', () => {
    expect(component.drawerOpen()).toBe(false);

    const renewBtn = fixture.nativeElement.querySelector('.renew-action-side .btn-primary');
    renewBtn.click();
    fixture.detectChanges();

    expect(component.drawerOpen()).toBe(true);
    expect(component.drawerMode()).toBe('renewal');
    expect(component.selectedPlan()?.id).toBe(2);

    // ZERO database records inserted on click!
    expect(mockApi.requestApplicationSubscriptionRenewal).not.toHaveBeenCalled();
    expect(mockApi.requestApplicationSubscriptionUpgrade).not.toHaveBeenCalled();
  });

  it('allows switching plan directly in the drawer without errors', () => {
    component.openRenewalDrawer(mockActiveSubscription);
    fixture.detectChanges();

    expect(component.selectedPlan()?.id).toBe(2);

    // Switch to Enterprise plan in drawer
    const enterprisePlan = mockPlans.find((p) => p.id === 3)!;
    component.selectPlanInDrawer(enterprisePlan);
    fixture.detectChanges();

    expect(component.selectedPlan()?.id).toBe(3);
    expect(component.drawerMode()).toBe('upgrade');

    const drawerTitle = fixture.nativeElement.querySelector('.selected-plan-summary h3');
    expect(drawerTitle?.textContent).toContain('Enterprise Showcase Plan');
  });

  it('cancels an existing pending subscription request when Cancel Request button is clicked', async () => {
    const pendingSub: ApplicationSubscription = {
      ...mockActiveSubscription,
      id: 99,
      subscription_status: 'PENDING',
      latest_proof_review_status: null,
    };
    component.subscriptions.set([mockActiveSubscription, pendingSub]);
    fixture.detectChanges();

    const cancelBtn = fixture.nativeElement.querySelector('.btn-cancel-pending');
    expect(cancelBtn).toBeTruthy();

    await component.cancelPendingRequest(99);
    expect(mockApi.cancelApplicationSubscription).toHaveBeenCalledWith(201, 99);
  });

  it('clicking "View Details" on active/approved subscription shows locked and verified payment proof (cannot change)', async () => {
    expect(component.detailDrawerOpen()).toBe(false);

    const detailBtn = fixture.nativeElement.querySelector(
      '.renew-action-side .btn-detail-secondary',
    );
    expect(detailBtn).toBeTruthy();
    detailBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.detailDrawerOpen()).toBe(true);
    expect(mockApi.getSubscriptionDetail).toHaveBeenCalledWith(201, 10);

    const el: HTMLElement = fixture.nativeElement;
    // Verified and locked banner must be present
    const lockedBox = el.querySelector('.proof-verified-box');
    expect(lockedBox).toBeTruthy();
    expect(lockedBox?.textContent).toContain('Payment Proof Verified & Approved');
    expect(lockedBox?.textContent).toContain('locked and cannot be modified');

    // Resubmit form must NOT be shown when verified/active
    const resubmitForm = el.querySelector('.resubmit-proof-form');
    expect(resubmitForm).toBeNull();
  });

  it('when subscription is rejected, clicking "View Details" displays the rejection note and allows resubmitting payment receipt', async () => {
    const rejectedSub: ApplicationSubscription = {
      ...mockActiveSubscription,
      id: 77,
      subscription_status: 'REJECTED',
      rejection_reason: 'UTR was not legible on transaction screenshot.',
    };
    (mockApi.getSubscriptionDetail as any).mockResolvedValueOnce({
      ...rejectedSub,
      proofs: [
        {
          id: 5,
          payment_reference: 'UTR_BLURRY',
          review_status: 'REJECTED',
          review_notes: 'Please attach a full receipt.',
        },
      ],
    });

    await component.openDetail(rejectedSub);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rejectedBox = el.querySelector('.proof-rejected-box');
    expect(rejectedBox).toBeTruthy();
    expect(rejectedBox?.textContent).toContain('UTR was not legible on transaction screenshot.');

    // Resubmission form IS present
    const resubmitForm = el.querySelector('.resubmit-proof-form');
    expect(resubmitForm).toBeTruthy();
    expect(resubmitForm?.textContent).toContain('Upload Revised Receipt to Resubmit');

    // Simulate resubmission
    const fakeFile = new File(['content'], 'clear-receipt.png', { type: 'image/png' });
    component.resubmitProofFile.set(fakeFile);
    component.resubmitReference.set('UTR999888777666');

    await component.submitResubmittedProof();
    expect(mockApi.uploadApplicationPaymentProof).toHaveBeenCalledWith(
      null,
      201,
      77,
      fakeFile,
      'UTR999888777666',
    );
  });

  it('rejects files larger than 10MB or invalid types during drawer proof submission', async () => {
    (mockApi as any).requestApplicationSubscriptionRenewal = vi.fn();
    (mockApi as any).requestApplicationSubscriptionUpgrade = vi.fn();

    component.openRenewalDrawer(mockActiveSubscription);
    fixture.detectChanges();

    // 1. Oversized file (>10MB)
    const largeFile = new File(['x'.repeat(11)], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
    component.drawerProofFile.set(largeFile);
    component.drawerReference.set('UTR123456');

    await component.submitDrawerPayment();
    expect(component.drawerError()).toContain('10MB');
    expect((mockApi as any).requestApplicationSubscriptionRenewal).not.toHaveBeenCalled();

    // 2. Disallowed file type (.exe)
    const badFile = new File(['dummy'], 'bad.exe', { type: 'application/x-msdownload' });
    component.drawerProofFile.set(badFile);

    await component.submitDrawerPayment();
    expect(component.drawerError()).toContain('JPG, PNG, WebP or PDF');
    expect((mockApi as any).requestApplicationSubscriptionRenewal).not.toHaveBeenCalled();
  });

  it('rolls back newly created pending subscription if payment proof upload fails (atomicity)', async () => {
    (mockApi as any).requestApplicationSubscriptionRenewal = vi.fn().mockResolvedValue({ id: 99 });
    (mockApi as any).uploadApplicationPaymentProof = vi
      .fn()
      .mockRejectedValue(new Error('Network failure uploading receipt'));
    (mockApi as any).cancelApplicationSubscription = vi.fn().mockResolvedValue({ success: true });

    component.openRenewalDrawer(mockActiveSubscription);
    fixture.detectChanges();

    const validFile = new File(['receipt data'], 'receipt.jpg', { type: 'image/jpeg' });
    component.drawerProofFile.set(validFile);
    component.drawerReference.set('UTR_ROLLBACK_TEST');

    await component.submitDrawerPayment();

    expect((mockApi as any).requestApplicationSubscriptionRenewal).toHaveBeenCalledWith(201, 10);
    expect((mockApi as any).uploadApplicationPaymentProof).toHaveBeenCalledWith(
      null,
      201,
      99,
      validFile,
      'UTR_ROLLBACK_TEST',
    );
    // Atomicity rollback verification:
    expect((mockApi as any).cancelApplicationSubscription).toHaveBeenCalledWith(201, 99);
    expect(component.drawerError()).toContain('Network failure uploading receipt');
  });
});
