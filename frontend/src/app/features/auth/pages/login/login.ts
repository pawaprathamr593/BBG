import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SocialProvider } from '../../../../core/auth/auth.models';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly providerNotice = signal('');
  readonly passwordVisible = signal(false);

  constructor() {
    void this.auth.loadSocialConfig().then((config) => {
      if (!Object.values(config.providers).some((provider) => provider.enabled)) {
        this.providerNotice.set('Social sign-in is ready for setup. Add provider credentials to the root .env to enable these options.');
      }
    }).catch(() => {
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
      await this.auth.authenticateSocial(provider, 'login');
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
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set('');

    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
