import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-social-auth-callback',
  imports: [RouterLink],
  templateUrl: './social-callback.html',
  styleUrl: '../login/login.scss',
})
export class SocialAuthCallback {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly busy = signal(true);
  readonly error = signal('');

  constructor() {
    void this.completeSignIn();
  }

  private async completeSignIn(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const providerError = params.get('error_description') || params.get('error');
    const code = params.get('code') || '';
    const state = params.get('state') || '';

    if (providerError) {
      this.error.set('Instagram sign-in was cancelled or could not be completed.');
      this.busy.set(false);
      return;
    }
    if (!code || !state) {
      this.error.set('The Instagram sign-in response is incomplete. Please try again.');
      this.busy.set(false);
      return;
    }

    try {
      await this.auth.completeInstagramLogin(code, state);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
