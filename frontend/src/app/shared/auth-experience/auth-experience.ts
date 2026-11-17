import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SocialAuthIntent, SocialProvider } from '../../core/auth/auth.models';

@Component({
  selector: 'app-auth-experience',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './auth-experience.html',
  styleUrl: './auth-experience.scss',
})
export class AuthExperienceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @Input() mode: SocialAuthIntent = 'login';
  @Input() presentation: 'page' | 'popup' = 'page';
  @Input() reason = '';
  @Input() brandName = 'BBG';
  @Output() authenticated = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  readonly activeMode = signal<SocialAuthIntent>('login');
  readonly emailFormVisible = signal(false);
  readonly compactLoginView = signal(false);
  readonly passwordVisible = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly providerNotice = signal('');
  readonly recoveryNotice = signal('');

  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.maxLength(150)]],
    identifier: [''],
    email: ['', [Validators.email, Validators.maxLength(190)]],
    mobile: ['', [Validators.maxLength(25)]],
    password: [''],
  });

  ngOnInit(): void {
    this.activeMode.set(this.mode);
    void this.auth.loadSocialConfig().then((config) => {
      if (!Object.values(config.providers).some((provider) => provider.enabled)) {
        this.providerNotice.set('Social sign-in is not configured yet. You can continue with email or phone.');
      }
    }).catch(() => {
      this.providerNotice.set('Social sign-in options are temporarily unavailable.');
    });
  }

  providerEnabled(provider: SocialProvider): boolean {
    return this.auth.socialConfig()?.providers?.[provider]?.enabled ?? false;
  }

  switchMode(mode: SocialAuthIntent): void {
    this.activeMode.set(mode);
    this.emailFormVisible.set(false);
    this.compactLoginView.set(false);
    this.error.set('');
    this.recoveryNotice.set('');
    this.form.reset();
  }

  toggleEmailForm(): void {
    this.emailFormVisible.update((visible) => !visible);
    this.error.set('');
  }

  showPasswordLogin(): void {
    this.compactLoginView.set(true);
    this.emailFormVisible.set(true);
    this.error.set('');
  }

  showOtherLoginMethods(): void {
    this.compactLoginView.set(false);
    this.emailFormVisible.set(false);
    this.error.set('');
    this.recoveryNotice.set('');
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  async selectProvider(provider: SocialProvider): Promise<void> {
    if (this.busy()) return;
    const values = this.form.getRawValue();
    if (provider === 'INSTAGRAM' && this.activeMode() === 'register' && !values.email.trim() && !values.mobile.trim()) {
      this.error.set('Instagram registration currently requires an email address or mobile number. Choose email or phone to enter your details.');
      this.emailFormVisible.set(true);
      return;
    }

    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.authenticateSocial(provider, this.activeMode(), {
        ...(values.full_name.trim() ? { full_name: values.full_name.trim() } : {}),
        ...(values.email.trim() ? { email: values.email.trim() } : {}),
        ...(values.mobile.trim() ? { mobile: values.mobile.trim() } : {}),
      });
      await this.onAuthenticated();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    const values = this.form.getRawValue();
    this.error.set('');
    this.recoveryNotice.set('');

    if (this.activeMode() === 'login') {
      if (!values.identifier.trim() || !values.password) {
        this.error.set('Enter your email or mobile number and password.');
        this.form.controls.identifier.markAsTouched();
        this.form.controls.password.markAsTouched();
        return;
      }
    } else {
      if (!values.full_name.trim()) {
        this.error.set('Enter your full name.');
        this.form.controls.full_name.markAsTouched();
        return;
      }
      if (!values.email.trim() && !values.mobile.trim()) {
        this.error.set('Enter at least an email address or mobile number.');
        this.form.controls.email.markAsTouched();
        this.form.controls.mobile.markAsTouched();
        return;
      }
      if (values.email.trim() && this.form.controls.email.invalid) {
        this.error.set('Enter a valid email address.');
        this.form.controls.email.markAsTouched();
        return;
      }
      if (values.password.length < 8) {
        this.error.set('Your password must contain at least 8 characters.');
        this.form.controls.password.markAsTouched();
        return;
      }
    }

    this.busy.set(true);
    try {
      if (this.activeMode() === 'login') {
        await this.auth.login({ identifier: values.identifier.trim(), password: values.password });
      } else {
        await this.auth.register({
          full_name: values.full_name.trim(),
          password: values.password,
          ...(values.email.trim() ? { email: values.email.trim() } : {}),
          ...(values.mobile.trim() ? { mobile: values.mobile.trim() } : {}),
        });
      }
      await this.onAuthenticated();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  showRecoveryNotice(): void {
    this.recoveryNotice.set('Password recovery is not connected to the backend yet. No reset request has been sent.');
  }

  private async onAuthenticated(): Promise<void> {
    if (this.presentation === 'popup') {
      this.authenticated.emit();
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    await this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
  }
}
