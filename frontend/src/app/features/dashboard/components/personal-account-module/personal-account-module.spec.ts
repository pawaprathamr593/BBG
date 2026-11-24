import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { PersonalAccountModule } from './personal-account-module';
import { API_BASE_URL } from '../../../../core/config/api-base-url';
import { AuthService } from '../../../../core/auth/auth.service';
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
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'getActiveSessions').mockResolvedValue({ sessions: [], total_count: 0 });
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

  describe('Active Sessions & Security', () => {
    const mockSessions = [
      {
        id: 1,
        device_name: 'Mac',
        browser: 'Google Chrome',
        os: 'macOS',
        device_type: 'desktop' as const,
        ip_address: '192.168.1.100',
        is_internal_ip: true,
        issued_on: '2026-11-23 10:00:00',
        last_used_on: null,
        expires_on: '2026-12-23 10:00:00',
        is_current: true,
      },
      {
        id: 2,
        device_name: 'iPhone',
        browser: 'Apple Safari',
        os: 'iOS',
        device_type: 'mobile' as const,
        ip_address: '49.36.10.2',
        is_internal_ip: false,
        issued_on: '2026-11-22 08:30:00',
        last_used_on: '2026-11-23 09:15:00',
        expires_on: '2026-12-22 08:30:00',
        is_current: false,
      },
    ];

    it('renders active sessions with authoritative Current Device badge', () => {
      component.sessions.set(mockSessions);
      component.sessionsLoading.set(false);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;

      expect(el.textContent).toContain('Active Sign-in Sessions');
      expect(el.textContent).toContain('Mac');
      expect(el.textContent).toContain('Current Device');
      expect(el.textContent).toContain('iPhone');
      expect(el.textContent).toContain('Google Chrome on macOS');
      expect(el.textContent).toContain('Apple Safari on iOS');
      expect(el.textContent).toContain('Local Network');
      expect(component.otherSessionsCount()).toBe(1);
    });

    it('preserves current device immunity without individual sign out button', () => {
      component.sessions.set(mockSessions);
      component.sessionsLoading.set(false);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;

      const currentCard = el.querySelector('.session-card.current-session');
      expect(currentCard).not.toBeNull();
      expect(currentCard?.textContent).toContain('Active session');
      expect(currentCard?.querySelector('.btn-revoke')).toBeNull();

      const nonCurrentCard = el.querySelectorAll('.session-card')[1];
      expect(nonCurrentCard.querySelector('.btn-revoke')).not.toBeNull();
      expect(nonCurrentCard.textContent).toContain('Sign Out');
    });

    it('prompts confirmation when signing out an individual other session', async () => {
      component.sessions.set(mockSessions);
      component.sessionsLoading.set(false);
      fixture.detectChanges();

      const otherSession = mockSessions[1];
      component.promptRevokeSession(otherSession);
      expect(component.confirmRevokeTarget()).toEqual(otherSession);

      const auth = TestBed.inject(AuthService);
      const revokeSpy = vi.spyOn(auth, 'revokeSession').mockResolvedValue(undefined);

      await component.confirmRevokeSession();

      expect(revokeSpy).toHaveBeenCalledWith(2);
      expect(component.sessions().length).toBe(1);
      expect(component.sessions()[0].id).toBe(1);
      expect(component.sessionFeedback()?.type).toBe('success');
    });

    it('prompts confirmation and signs out all other devices', async () => {
      component.sessions.set(mockSessions);
      component.sessionsLoading.set(false);
      fixture.detectChanges();

      expect(component.otherSessionsCount()).toBe(1);
      component.promptRevokeAllOthers();
      expect(component.confirmRevokeAllOpen()).toBe(true);

      const auth = TestBed.inject(AuthService);
      const revokeAllSpy = vi.spyOn(auth, 'revokeAllOtherSessions').mockResolvedValue(1);

      await component.confirmRevokeAllOthers();

      expect(revokeAllSpy).toHaveBeenCalled();
      expect(component.sessions().length).toBe(1);
      expect(component.sessions()[0].is_current).toBe(true);
      expect(component.sessionFeedback()?.message).toContain('Signed out 1 other device(s) successfully');
    });

    it('displays reassuring message when only current device session exists', () => {
      component.sessions.set([mockSessions[0]]);
      component.sessionsLoading.set(false);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;

      expect(el.textContent).toContain('No other active sessions. Your account is only signed in on this device.');
      expect(component.otherSessionsCount()).toBe(0);
    });
  });
});
