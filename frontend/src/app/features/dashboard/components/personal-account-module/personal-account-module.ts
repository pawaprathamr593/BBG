import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { DashboardTenant } from '../../../../core/dashboard/dashboard-api.service';
import { WorkspaceContextService } from '../../../../core/workspace/workspace-context.service';
import { WorkspaceModuleApiService } from '../../../../core/workspace/workspace-module-api.service';
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
  imports: [FormsModule, WorkspaceDrawer, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './personal-account-module.html',
  styleUrl: './personal-account-module.scss',
})
export class PersonalAccountModule {
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

  async openBusinessWorkspace(tenantId: number): Promise<void> {
    if (this.busy()) return;
    try {
      this.busy.set(true);
      await this.workspace.switchWorkspace(tenantId);
      await this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.error.set(this.auth.errorMessage(err));
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }

  registerBusiness(): void {
    void this.router.navigateByUrl('/dashboard/businesses/register');
  }
}
