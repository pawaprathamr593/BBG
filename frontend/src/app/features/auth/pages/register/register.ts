import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SocialProvider } from '../../../../core/auth/auth.models';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: '../login/login.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly providerNotice = signal('');
  readonly passwordVisible = signal(false);

  constructor() {
    void this.auth.loadSocialConfig().catch(() => {
      this.providerNotice.set('Social sign-in is temporarily unavailable. Use your email or mobile number instead.');
    });
  }

  providerEnabled(provider: SocialProvider): boolean {
    return this.auth.socialConfig()?.providers?.[provider]?.enabled ?? false;
  }

  async selectProvider(provider: SocialProvider): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.providerNotice.set('');

    try {
      await this.auth.authenticateSocial(provider, 'register');
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.email, Validators.maxLength(190)]],
    mobile: ['', [Validators.maxLength(25)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, mobile, ...rest } = this.form.getRawValue();

    if (!email.trim() && !mobile.trim()) {
      this.error.set('Enter an email address or mobile number.');
      return;
    }

    this.busy.set(true);
    this.error.set('');

    try {
      await this.auth.register({
        ...rest,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
      });
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
