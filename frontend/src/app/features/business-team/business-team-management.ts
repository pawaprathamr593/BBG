import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { EligibleTenantUser, TenantManagementApiService, TenantMember } from '../../core/tenant/tenant-management-api.service';

@Component({
  selector: 'app-business-team-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="team-page">
      <section class="team-card">
        <a class="back-link" routerLink="/workspace">← Back to your businesses</a>
        <p class="eyebrow">BUSINESS WORKSPACE</p>
        <h1>Team &amp; Access</h1>
        <p class="intro">Add an existing BBG user or create an invitation link for a new team member.</p>

        @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
        @if (notice()) { <div class="notice success" role="status">{{ notice() }}</div> }

        <section class="add-member">
          <div class="section-heading"><div><h2>Add a team member</h2><p>Search by the exact email address linked to their BBG account.</p></div><span>Tenant Order Manager</span></div>
          <div class="search-row">
            <label><span>Email address</span><input type="email" [value]="email()" (input)="email.set($any($event.target).value)" placeholder="colleague@company.com" /></label>
            <button type="button" class="primary-button" (click)="searchUsers()" [disabled]="busy()">{{ searching() ? 'Searching…' : 'Search user' }}</button>
          </div>
          @if (searchResults().length) {
            <div class="search-results">
              @for (user of searchResults(); track user.user_id) {
                <article class="search-result">
                  <div><strong>{{ user.full_name }}</strong><span>{{ user.email }}</span></div>
                  <button type="button" class="secondary-button" (click)="addUser(user)" [disabled]="busy()">Add to business</button>
                </article>
              }
            </div>
          } @else if (searched() && !searching()) {
            <div class="empty-search"><p>No eligible active BBG account was found for this email.</p><button type="button" class="secondary-button" (click)="createInvite()" [disabled]="busy()">Create invitation link</button></div>
          }
          @if (invitationLink()) {
            <div class="invitation-box">
              <div><strong>Invitation link created</strong><span>Expires {{ invitationExpiresOn() }}</span><input readonly [value]="invitationLink()" aria-label="Invitation link" /></div>
              <button type="button" class="secondary-button" (click)="copyInvitationLink()">Copy link</button>
            </div>
          }
          <p class="role-note">This workflow assigns only the existing TENANT_ORDER_MANAGER tenant role. Tenant owners and platform roles cannot be assigned here. Invitees must register or sign in using the invited email address.</p>
        </section>

        <section class="member-list">
          <div class="section-heading"><div><h2>Current team</h2><p>People who can access this business workspace.</p></div><button type="button" class="secondary-button" (click)="loadMembers()" [disabled]="loading()">Refresh</button></div>
          @if (loading()) {
            <p class="state-message">Loading team members…</p>
          } @else if (!members().length) {
            <p class="state-message">No team members are currently listed.</p>
          } @else {
            <div class="members">
              @for (member of members(); track member.user_id) {
                <article class="member-row"><div><strong>{{ member.full_name }}</strong><span>{{ member.email }}</span></div><span class="role-pill">{{ member.role_codes || 'Tenant member' }}</span></article>
              }
            </div>
          }
        </section>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .team-page{display:grid;place-items:start center;padding:clamp(20px,4vw,48px) 16px}
    .team-card{width:min(900px,100%);padding:clamp(20px,4vw,38px);background:var(--surface-card);border:1px solid var(--border);border-radius:18px}
    .back-link{display:inline-block;margin-bottom:26px;color:var(--text-secondary);font-size:.78rem;text-decoration:none}
    .eyebrow{margin:0 0 9px;color:var(--brand);font-size:.67rem;font-weight:850;letter-spacing:.13em}
    h1{margin:0;font-size:clamp(1.8rem,4vw,2.35rem);letter-spacing:-.04em}.intro{margin:9px 0 24px;color:var(--text-secondary);font-size:.86rem;line-height:1.55}
    .notice{margin:0 0 16px;padding:11px 13px;border-radius:9px;font-size:.78rem}.notice.error{color:#a32929;background:#fceeee}.notice.success{color:#176b43;background:#e8f5ed}
    .add-member,.member-list{display:grid;gap:15px;padding:20px 0;border-top:1px solid var(--border)}
    .section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.section-heading h2{margin:0;font-size:1.05rem}.section-heading p{margin:5px 0 0;color:var(--text-secondary);font-size:.75rem;line-height:1.5}.section-heading>span{padding:7px 9px;color:var(--brand);background:var(--brand-soft);border-radius:8px;font-size:.68rem;font-weight:800;white-space:nowrap}
    .search-row{display:flex;align-items:flex-end;gap:12px}.search-row label{display:grid;gap:7px;flex:1}.search-row label span{font-size:.75rem;font-weight:750}.search-row input,.invitation-box input{width:100%;min-width:0;padding:11px 12px;color:var(--text-primary);background:var(--surface-page);border:1px solid var(--border);border-radius:8px;font:inherit;font-size:.82rem}
    .primary-button,.secondary-button{padding:11px 14px;border:0;border-radius:9px;font:inherit;font-size:.77rem;font-weight:800;cursor:pointer}.primary-button{color:#fff;background:var(--brand)}.secondary-button{color:var(--text-primary);background:var(--surface-subtle);border:1px solid var(--border)}button:disabled{opacity:.55;cursor:wait}
    .search-results,.members{display:grid;gap:9px}.search-result,.member-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px}.search-result>div,.member-row>div,.invitation-box>div{display:grid;gap:4px;min-width:0}.search-result strong,.member-row strong,.invitation-box strong{font-size:.8rem}.search-result span,.member-row>div>span,.invitation-box span{color:var(--text-secondary);font-size:.72rem;overflow-wrap:anywhere}
    .empty-search{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;background:var(--surface-subtle);border-radius:9px}.empty-search p{margin:0;color:var(--text-secondary);font-size:.78rem}
    .invitation-box{display:flex;align-items:flex-end;gap:12px;padding:14px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px}.invitation-box>div{flex:1}.role-pill{padding:6px 8px;color:var(--brand);background:var(--brand-soft);border-radius:7px;font-size:.66rem;font-weight:800}.role-note,.state-message{margin:0;color:var(--text-secondary);font-size:.73rem;line-height:1.55}
    @media(max-width:620px){.section-heading,.search-row,.search-result,.member-row,.empty-search,.invitation-box{align-items:stretch;flex-direction:column}.search-row button,.search-result button,.empty-search button,.invitation-box button{width:100%}.role-pill{align-self:flex-start}}
  `],
})
export class BusinessTeamManagement implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly tenantApi = inject(TenantManagementApiService);

  readonly tenantId = Number(this.route.snapshot.queryParamMap.get('tenant_id') ?? 0);
  readonly members = signal<TenantMember[]>([]);
  readonly searchResults = signal<EligibleTenantUser[]>([]);
  readonly email = signal('');
  readonly invitationLink = signal('');
  readonly invitationExpiresOn = signal('');
  readonly error = signal('');
  readonly notice = signal('');
  readonly loading = signal(false);
  readonly searching = signal(false);
  readonly busy = signal(false);
  readonly searched = signal(false);

  async ngOnInit(): Promise<void> {
    if (!Number.isInteger(this.tenantId) || this.tenantId < 1) {
      this.error.set('A valid business workspace is required.');
      return;
    }
    try {
      if (!await this.auth.restoreSession()) {
        await this.router.navigate(['/login'], {
          queryParams: { returnUrl: '/business/team?tenant_id=' + this.tenantId },
        });
        return;
      }
      await this.loadMembers();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  async loadMembers(): Promise<void> {
    if (!this.tenantId || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.members.set(await this.tenantApi.listMembers(this.tenantId));
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async searchUsers(): Promise<void> {
    const email = this.email().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || this.searching()) {
      this.error.set('Enter a valid email address to search for an existing BBG user.');
      return;
    }
    this.searching.set(true);
    this.searched.set(false);
    this.searchResults.set([]);
    this.invitationLink.set('');
    this.error.set('');
    this.notice.set('');
    try {
      this.searchResults.set(await this.tenantApi.searchEligibleUsers(this.tenantId, email));
      this.searched.set(true);
      if (!this.searchResults().length) this.notice.set('No active BBG account was found. You can create an invitation link.');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.searching.set(false);
    }
  }

  async addUser(user: EligibleTenantUser): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.tenantApi.addExistingUser(this.tenantId, user.user_id);
      this.notice.set('The user was added as a Tenant Order Manager.');
      this.searchResults.set([]);
      this.email.set('');
      this.searched.set(false);
      await this.loadMembers();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async createInvite(): Promise<void> {
    const email = this.email().trim().toLowerCase();
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const invitation = await this.tenantApi.createInvitation(this.tenantId, email);
      this.invitationLink.set(window.location.origin + '/invite/accept?token=' + encodeURIComponent(invitation.invitation_token));
      this.invitationExpiresOn.set(invitation.expires_on);
      this.notice.set('Invitation link created. Share it with the invited email address; it expires in seven days.');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async copyInvitationLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.invitationLink());
      this.notice.set('Invitation link copied.');
    } catch {
      this.error.set('Could not copy the invitation link. Select and copy it manually.');
    }
  }
}
