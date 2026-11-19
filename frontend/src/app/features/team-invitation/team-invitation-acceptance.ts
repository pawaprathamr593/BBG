import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-base-url';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';

interface InvitationResponse {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr?: string[];
  data?: { tenant_id?: number } | [];
}

@Component({
  selector: 'app-team-invitation-acceptance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="invite-page">
      <section class="invite-card">
        <p class="eyebrow">BBG TEAM INVITATION</p>
        @if (busy()) {
          <div class="invite-loading"><span class="spinner"></span><div><strong>Accepting your invitation</strong><p>Adding your account to the business workspace…</p></div></div>
        } @else if (error()) {
          <h1>We couldn’t accept this invitation</h1>
          <p>{{ error() }}</p>
          <a routerLink="/">Return to BBG</a>
        } @else if (needsSignIn()) {
          <h1>You’ve been invited to join a BBG business</h1>
          <p>Sign in with the email address that received this invitation. If you’re new to BBG, create an account using that same email address.</p>
          <div class="invite-actions">
            <a [routerLink]="['/login']" [queryParams]="{ returnUrl: returnUrl }">Sign in</a>
            <a class="secondary" [routerLink]="['/register']" [queryParams]="{ returnUrl: returnUrl }">Create account</a>
          </div>
        } @else {
          <h1>Invitation accepted</h1>
          <p>Your account has been added to the business workspace with the Tenant Order Manager role.</p>
          <a routerLink="/dashboard">Open team workspace</a>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .invite-page{display:grid;min-height:70vh;place-items:center;padding:30px 16px}
    .invite-card{width:min(560px,100%);padding:clamp(24px,4vw,40px);background:var(--surface-card);border:1px solid var(--border);border-radius:18px;box-shadow:0 14px 42px rgba(20,35,26,.05)}
    .eyebrow{margin:0 0 10px;color:var(--brand);font-size:.68rem;font-weight:800;letter-spacing:.13em}
    h1{margin:0;font-size:clamp(1.7rem,4vw,2.2rem);letter-spacing:-.04em}.invite-card>p:not(.eyebrow){color:var(--text-secondary);font-size:.88rem;line-height:1.6}
    .invite-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.invite-actions a,.invite-card>a{display:inline-flex;margin-top:20px;padding:11px 15px;color:#fff;background:var(--brand);border-radius:9px;text-decoration:none;font-size:.82rem;font-weight:750}
    .invite-actions a.secondary{color:var(--text-primary);background:var(--surface-subtle);border:1px solid var(--border)}
    .invite-loading{display:flex;align-items:center;gap:14px}.invite-loading p{margin:5px 0 0;color:var(--text-secondary);font-size:.8rem}
    .spinner{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  `],
})
export class TeamInvitationAcceptance implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly auth = inject(AuthService);
  private readonly workspace = inject(WorkspaceContextService);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly needsSignIn = signal(false);
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly returnUrl = '/invite/accept?token=' + encodeURIComponent(this.token);

  async ngOnInit(): Promise<void> {
    if (!/^[a-f0-9]{64}$/i.test(this.token)) {
      this.error.set('The invitation link is invalid.');
      return;
    }
    try {
      if (!await this.auth.restoreSession()) {
        this.needsSignIn.set(true);
        return;
      }
      await this.accept();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  private async accept(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(this.http.post<InvitationResponse>(
        this.apiBaseUrl + '/api/v1/tenants/invitations/accept',
        { tenantParam: { actionData: { invitation_token: this.token } } },
      ));
      if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
        throw new Error(response.msgArr?.join(' ') || 'The invitation could not be accepted.');
      }
      const tenantId = Number(response.data.tenant_id ?? 0);
      if (!tenantId) throw new Error('The invitation was accepted but the workspace could not be identified.');
      await this.workspace.initialize();
      await this.workspace.switchWorkspace(tenantId);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
