import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PersonalAccountModule } from './personal-account-module';
import { API_BASE_URL } from '../../../../core/config/api-base-url';
import { DashboardTenant } from '../../../../core/dashboard/dashboard-api.service';

describe('PersonalAccountModule', () => {
  let component: PersonalAccountModule;
  let fixture: ComponentFixture<PersonalAccountModule>;

  const mockProfile: Record<string, unknown> = {
    user_id: 101,
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    mobile: '+919876543210',
    account_status: 'ACTIVE',
    email_verified: true,
    mobile_verified: true,
    has_password: true,
    created_on: '2025-01-15T10:30:00Z',
  };

  const mockBusinesses: DashboardTenant[] = [
    {
      id: 1,
      tenant_code: 'BBG-CORP-01',
      tenant_name: 'Acme Enterprises',
      profile_business_name: 'Acme Superstore',
      tenant_type: 'RETAIL',
      tenant_status: 'ACTIVE',
      membership_status: 'ACTIVE',
      role_codes: 'OWNER',
      active_entitlements: null,
      business_email: 'contact@acme.com',
      business_phone: '+919999888877',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalAccountModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonalAccountModule);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profile', mockProfile);
    fixture.componentRef.setInput('businesses', mockBusinesses);
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();
  });

  it('renders personal profile details and verification badges', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Jane Doe');
    expect(el.textContent).toContain('jane@example.com');
    expect(el.textContent).toContain('+919876543210');
    expect(component.initials()).toBe('JD');
    expect(component.emailVerified()).toBe(true);
    expect(component.mobileVerified()).toBe(true);
    expect(component.hasPassword()).toBe(true);
  });

  it('renders associated businesses with title and role', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Acme Superstore');
    expect(el.textContent).toContain('BBG-CORP-01');
    expect(el.textContent).toContain('OWNER');
    expect(el.textContent).toContain('Mumbai, Maharashtra');
  });

  it('renders empty business state when user has no businesses', () => {
    fixture.componentRef.setInput('businesses', []);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No Registered Business Yet');
    expect(el.textContent).toContain('Register Your Business');
  });

  it('opens and populates the edit profile drawer', () => {
    component.edit();
    expect(component.profileDrawerOpen()).toBe(true);
    expect(component.form().full_name).toBe('Jane Doe');
    expect(component.form().email).toBe('jane@example.com');
    expect(component.form().mobile).toBe('+919876543210');
  });

  it('opens password drawer with change password title for accounts with existing password', () => {
    component.openPassword();
    expect(component.passwordDrawerOpen()).toBe(true);
    expect(component.hasPassword()).toBe(true);
  });
});
