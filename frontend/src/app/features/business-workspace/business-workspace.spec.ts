import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessWorkspace } from './business-workspace';
import { AuthService } from '../../core/auth/auth.service';
import {
  BusinessApplication,
  BusinessRegistrationApiService,
} from '../../core/business/business-registration-api.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';

describe('BusinessWorkspace', () => {
  let component: BusinessWorkspace;
  let fixture: ComponentFixture<BusinessWorkspace>;
  let mockAuth: Partial<AuthService>;
  let mockApi: Partial<BusinessRegistrationApiService>;
  let mockWorkspace: Partial<WorkspaceContextService>;
  let mockRouter: Partial<Router>;

  const mockApprovedBusiness: BusinessApplication = {
    business_id: 101,
    tenant_id: 201,
    business_name: 'Metro Organics Store',
    business_slug: 'metro-organics',
    business_description: 'Organic groceries and artisan dairy',
    primary_category_id: 1,
    business_phone: '+91 98765 43210',
    whatsapp_number: '+91 98765 43210',
    business_email: 'hello@metroorganics.in',
    logo_path: 'https://cdn.bbg.in/logos/metro.png',
    address_line_1: 'Plot 42, Green Avenue',
    address_line_2: 'Sector 5',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560001',
    country_code: 'IN',
    latitude: 12.9716,
    longitude: 77.5946,
    approval_status: 'APPROVED',
    approved_on: '2026-03-01T10:00:00Z',
    rejection_reason: null,
    publication_status: 'PUBLISHED',
    tenant_name: 'Metro Organics Store',
    tenant_status: 'ACTIVE',
  };

  beforeEach(async () => {
    mockAuth = {
      restoreSession: vi.fn().mockResolvedValue(true),
      user: signal({ id: 1, full_name: 'Test Owner' } as any),
      loadProfile: vi.fn().mockResolvedValue(true),
      errorMessage: vi.fn((err: unknown) => (err instanceof Error ? err.message : String(err))),
    };

    mockApi = {
      getMyApplications: vi.fn().mockResolvedValue([mockApprovedBusiness]),
      getCurrentApplicationSubscription: vi.fn().mockResolvedValue(null),
    };

    mockWorkspace = {
      switchWorkspace: vi.fn().mockResolvedValue(undefined),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [BusinessWorkspace],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: BusinessRegistrationApiService, useValue: mockApi },
        { provide: WorkspaceContextService, useValue: mockWorkspace },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessWorkspace);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders registered businesses with avatar, public storefront link and status badge', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const nameEl = el.querySelector('.heading-titles h2');
    expect(nameEl?.textContent).toContain('Metro Organics Store');

    const slugLink = el.querySelector('.slug-link') as HTMLAnchorElement;
    expect(slugLink).toBeTruthy();
    expect(slugLink.getAttribute('href')).toBe('/store/metro-organics');

    const avatarImg = el.querySelector('.biz-avatar-img') as HTMLImageElement;
    expect(avatarImg).toBeTruthy();
    expect(avatarImg.getAttribute('src')).toBe('https://cdn.bbg.in/logos/metro.png');
  });

  it('opens workspace dashboard when Open Workspace button is clicked', async () => {
    await component.openWorkspace(mockApprovedBusiness);
    expect(mockWorkspace.switchWorkspace).toHaveBeenCalledWith(201);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('navigates to catalogue when Products & Catalogue is clicked', async () => {
    await component.manageCatalogue(mockApprovedBusiness);
    expect(mockWorkspace.switchWorkspace).toHaveBeenCalledWith(201);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/catalogue']);
  });

  it('navigates to orders when Orders is clicked', async () => {
    await component.manageOrders(mockApprovedBusiness);
    expect(mockWorkspace.switchWorkspace).toHaveBeenCalledWith(201);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/orders']);
  });

  it('navigates to storefront when Storefront Settings is clicked', async () => {
    await component.manageStorefront(mockApprovedBusiness);
    expect(mockWorkspace.switchWorkspace).toHaveBeenCalledWith(201);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/storefront']);
  });

  it('navigates to team when Team & Access is clicked', async () => {
    await component.manageTeam(mockApprovedBusiness);
    expect(mockWorkspace.switchWorkspace).toHaveBeenCalledWith(201);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/members']);
  });

  it('navigates to subscriptions when Subscriptions & Billing is clicked', async () => {
    await component.manageSubscription(mockApprovedBusiness);
    expect(mockWorkspace.switchWorkspace).toHaveBeenCalledWith(201);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/subscriptions']);
  });

  it('displays non-fatal error banner if action fails', async () => {
    (mockWorkspace.switchWorkspace as any).mockRejectedValueOnce(new Error('Permission denied'));
    await component.manageCatalogue(mockApprovedBusiness);
    expect(component.actionError()).toContain('Permission denied');

    component.dismissActionError();
    expect(component.actionError()).toBe('');
  });
});
