import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

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
  readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally { this.busy.set(false); }
  }
}
