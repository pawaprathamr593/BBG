import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  EligibleTenantUser,
  TenantManagementApiService,
  TenantMember,
} from '../../core/tenant/tenant-management-api.service';
import { WorkspaceDrawer } from '../../shared/workspace-drawer/workspace-drawer';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-business-team-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    WorkspaceDrawer,
    StatusBadgeComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './business-team-management.html',
  styleUrl: './business-team-management.scss',
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

  readonly selectedMember = signal<TenantMember | null>(null);
  readonly permissionDrawerOpen = signal(false);

  async ngOnInit(): Promise<void> {
    if (!Number.isInteger(this.tenantId) || this.tenantId < 1) {
      this.error.set('A valid business workspace is required.');
      return;
    }
    try {
      if (!(await this.auth.restoreSession())) {
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
      if (!this.searchResults().length)
        this.notice.set('No active BBG account was found. You can create an invitation link.');
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
      this.invitationLink.set(
        window.location.origin +
          '/invite/accept?token=' +
          encodeURIComponent(invitation.invitation_token),
      );
      this.invitationExpiresOn.set(invitation.expires_on);
      this.notice.set(
        'Invitation link created. Share it with the invited email address; it expires in seven days.',
      );
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

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  initials(name: string): string {
    return (
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'U'
    );
  }

  openPermissionPanel(member: TenantMember): void {
    this.selectedMember.set(member);
    this.permissionDrawerOpen.set(true);
  }
}
