import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

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
  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.email, Validators.maxLength(190)]],
    mobile: ['', [Validators.maxLength(25)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) { this.form.markAllAsTouched(); return; }
    const { email, mobile, ...rest } = this.form.getRawValue();
    if (!email.trim() && !mobile.trim()) { this.error.set('Enter an email address or mobile number.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.auth.register({ ...rest, ...(email.trim() ? { email: email.trim() } : {}), ...(mobile.trim() ? { mobile: mobile.trim() } : {}) });
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to create your account. Please try again.');
    } finally { this.busy.set(false); }
  }
}
