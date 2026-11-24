import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserSession } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { DashboardTenant } from '../../../../core/dashboard/dashboard-api.service';
import { WorkspaceContextService } from '../../../../core/workspace/workspace-context.service';
import { WorkspaceModuleApiService } from '../../../../core/workspace/workspace-module-api.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { WorkspaceDrawer } from '../../../../shared/workspace-drawer/workspace-drawer';

interface PersonalProfileForm {
  full_name: string;
  email: string;
  mobile: string;
}

const emptyProfile = (): PersonalProfileForm => ({ full_name: '', email: '', mobile: '' });

@Component({
  selector: 'app-personal-account-module',
  standalone: true,
  imports: [FormsModule, WorkspaceDrawer, StatusBadgeComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './personal-account-module.html',
  styleUrl: './personal-account-module.scss',
})
export class PersonalAccountModule implements OnInit {
  readonly profile = input.required<Record<string, unknown>>();
  readonly businesses = input<DashboardTenant[]>([]);
  readonly canEdit = input(false);
  readonly refreshRequested = output<void>();

  readonly profileDrawerOpen = signal(false);
  readonly passwordDrawerOpen = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly passwordError = signal('');
  readonly form = signal<PersonalProfileForm>(emptyProfile());
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  // Active Sessions Signals
  readonly sessions = signal<UserSession[]>([]);
  readonly sessionsLoading = signal(false);
  readonly sessionsError = signal('');
  readonly sessionFeedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly revokingSessionId = signal<number | null>(null);
  readonly revokingAllOthers = signal(false);
  readonly confirmRevokeTarget = signal<UserSession | null>(null);
  readonly confirmRevokeAllOpen = signal(false);

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(WorkspaceModuleApiService);
  private readonly destroyRef = inject(DestroyRef);
  private alive = true;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.alive = false;
    });
  }

  ngOnInit(): void {
    void this.loadActiveSessions();
  }

  readonly otherSessionsCount = computed(
    () => this.sessions().filter((s) => !s.is_current).length,
  );

  readonly fullName = computed(() => String(this.profile()['full_name'] ?? 'BBG User').trim());
  readonly email = computed(() => {
    const val = this.profile()['email'];
    return val ? String(val).trim() : null;
  });
  readonly mobile = computed(() => {
    const val = this.profile()['mobile'];
    return val ? String(val).trim() : null;
  });
  readonly profileImage = computed(() => {
    const val = this.profile()['profile_image'];
    return val && typeof val === 'string' && val.trim() ? val.trim() : null;
  });
  readonly accountStatus = computed(() =>
    String(this.profile()['account_status'] ?? 'ACTIVE').toUpperCase(),
  );
  readonly emailVerified = computed(() => Boolean(this.profile()['email_verified']));
  readonly mobileVerified = computed(() => Boolean(this.profile()['mobile_verified']));
  readonly createdOn = computed(() => this.formatDate(this.profile()['created_on']));
  readonly lastLoginOn = computed(() => this.formatDateTime(this.profile()['last_login_on']));

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  initials(name?: string): string {
    const target = name ?? this.fullName();
    return (
      target
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'BB'
    );
  }

  display(key: string): string {
    const value = this.profile()[key];
    return value === null || value === undefined || value === '' ? 'Not provided' : String(value);
  }

  hasPassword(): boolean {
    return this.profile()['has_password'] === true || Number(this.profile()['has_password']) === 1;
  }

  formatDate(value: unknown): string {
    if (!value || typeof value !== 'string') return 'Not recorded';
    try {
      const d = new Date(value);
      return isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return String(value);
    }
  }

  formatDateTime(value: unknown): string {
    if (!value || typeof value !== 'string') return 'Not recorded';
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
    } catch {
      return String(value);
    }
  }

  edit(): void {
    if (!this.canEdit() || this.busy()) return;
    this.form.set({
      full_name: String(this.profile()['full_name'] ?? ''),
      email: String(this.profile()['email'] ?? ''),
      mobile: String(this.profile()['mobile'] ?? ''),
    });
    this.error.set('');
    this.profileDrawerOpen.set(true);
  }

  updateField(field: keyof PersonalProfileForm, value: string): void {
    this.form.update((form) => ({ ...form, [field]: value }));
  }

  async saveProfile(): Promise<void> {
    const form = this.form();
    if (!form.full_name.trim()) {
      this.error.set('Full name is required.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.request(
        '/api/v1/auth/profile/update',
        'updateProfile',
        {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
        },
        'authParam',
      );
      if (!this.alive) return;
      this.profileDrawerOpen.set(false);
      this.refreshRequested.emit();
    } catch (error) {
      if (this.alive) this.error.set(this.auth.errorMessage(error));
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }

  openPassword(): void {
    if (!this.canEdit() || this.busy()) return;
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.passwordError.set('');
    this.passwordDrawerOpen.set(true);
  }

  closePassword(): void {
    if (this.busy()) return;
    this.passwordDrawerOpen.set(false);
    this.passwordError.set('');
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
  }

  async updatePassword(): Promise<void> {
    if (this.busy()) return;
    const newPassword = this.newPassword();
    if (newPassword.length < 8) {
      this.passwordError.set('Use at least 8 characters for your new password.');
      return;
    }
    if (newPassword !== this.confirmPassword()) {
      this.passwordError.set('The new password and confirmation do not match.');
      return;
    }
    if (this.hasPassword() && !this.currentPassword()) {
      this.passwordError.set('Enter your current password.');
      return;
    }
    this.busy.set(true);
    this.passwordError.set('');
    try {
      await this.api.request(
        '/api/v1/auth/password/update',
        'setPassword',
        {
          ...(this.hasPassword() ? { current_password: this.currentPassword() } : {}),
          new_password: newPassword,
        },
        'authParam',
      );
      if (!this.alive) return;
      this.passwordDrawerOpen.set(false);
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.refreshRequested.emit();
    } catch (error) {
      if (this.alive) this.passwordError.set(this.auth.errorMessage(error));
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }

  async navigateToBusinessSection(tenantId: number, targetRoute: string): Promise<void> {
    if (this.busy()) return;
    try {
      this.busy.set(true);
      await this.workspace.switchWorkspace(Number(tenantId));
      await this.router.navigateByUrl(targetRoute);
    } catch (err) {
      this.error.set(this.auth.errorMessage(err));
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }

  async openBusinessWorkspace(tenantId: number): Promise<void> {
    await this.navigateToBusinessSection(tenantId, '/dashboard');
  }

  async manageCatalogue(tenantId: number): Promise<void> {
    await this.navigateToBusinessSection(tenantId, '/dashboard/catalogue');
  }

  async manageOrders(tenantId: number): Promise<void> {
    await this.navigateToBusinessSection(tenantId, '/dashboard/orders');
  }

  async manageStorefront(tenantId: number): Promise<void> {
    await this.navigateToBusinessSection(tenantId, '/dashboard/storefront');
  }

  async manageTeam(tenantId: number): Promise<void> {
    await this.navigateToBusinessSection(tenantId, '/dashboard/members');
  }

  async manageSubscriptions(tenantId: number): Promise<void> {
    await this.navigateToBusinessSection(tenantId, '/dashboard/subscriptions');
  }

  async manageBusinessProfile(tenantId: number): Promise<void> {
    await this.navigateToBusinessSection(tenantId, '/dashboard/profile');
  }

  registerBusiness(): void {
    void this.router.navigateByUrl('/dashboard/businesses/register');
  }

  async loadActiveSessions(): Promise<void> {
    this.sessionsLoading.set(true);
    this.sessionsError.set('');
    try {
      const res = await this.auth.getActiveSessions();
      if (!this.alive) return;
      this.sessions.set(res.sessions || []);
    } catch (err) {
      if (!this.alive) return;
      this.sessionsError.set(this.auth.errorMessage(err));
    } finally {
      if (this.alive) this.sessionsLoading.set(false);
    }
  }

  promptRevokeSession(session: UserSession): void {
    if (session.is_current || this.revokingSessionId() !== null || this.revokingAllOthers()) return;
    this.confirmRevokeTarget.set(session);
  }

  cancelRevokeSession(): void {
    this.confirmRevokeTarget.set(null);
  }

  async confirmRevokeSession(): Promise<void> {
    const target = this.confirmRevokeTarget();
    if (!target) return;
    this.confirmRevokeTarget.set(null);
    this.revokingSessionId.set(target.id);
    this.sessionFeedback.set(null);
    try {
      await this.auth.revokeSession(target.id);
      if (!this.alive) return;
      this.sessions.update((list) => list.filter((s) => s.id !== target.id));
      this.sessionFeedback.set({
        type: 'success',
        message: `Signed out ${target.device_name || 'session'} successfully.`,
      });
    } catch (err) {
      if (!this.alive) return;
      this.sessionFeedback.set({
        type: 'error',
        message: this.auth.errorMessage(err),
      });
    } finally {
      if (this.alive) this.revokingSessionId.set(null);
    }
  }

  promptRevokeAllOthers(): void {
    if (this.otherSessionsCount() === 0 || this.revokingAllOthers() || this.sessionsLoading()) return;
    this.confirmRevokeAllOpen.set(true);
  }

  cancelRevokeAllOthers(): void {
    this.confirmRevokeAllOpen.set(false);
  }

  async confirmRevokeAllOthers(): Promise<void> {
    this.confirmRevokeAllOpen.set(false);
    this.revokingAllOthers.set(true);
    this.sessionFeedback.set(null);
    try {
      const count = await this.auth.revokeAllOtherSessions();
      if (!this.alive) return;
      this.sessions.update((list) => list.filter((s) => s.is_current));
      this.sessionFeedback.set({
        type: 'success',
        message:
          count > 0
            ? `Signed out ${count} other device(s) successfully.`
            : 'No other devices were active.',
      });
    } catch (err) {
      if (!this.alive) return;
      this.sessionFeedback.set({
        type: 'error',
        message: this.auth.errorMessage(err),
      });
    } finally {
      if (this.alive) this.revokingAllOthers.set(false);
    }
  }

  dismissSessionFeedback(): void {
    this.sessionFeedback.set(null);
  }

  getDeviceIcon(deviceType: string): string {
    const t = (deviceType || '').toLowerCase();
    if (t === 'desktop') return '💻';
    if (t === 'mobile') return '📱';
    if (t === 'tablet') return '📟';
    return '🌐';
  }
}
