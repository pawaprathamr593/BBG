import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeMode, ThemeService } from '../../core/theme/theme.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import { WorkspaceDrawer } from '../workspace-drawer/workspace-drawer';

@Component({
  selector: 'app-user-profile-drawer',
  standalone: true,
  imports: [WorkspaceDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-profile-drawer.html',
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
      }
      .profile-trigger {
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        overflow: hidden;
        padding: 0;
        border: 2px solid var(--border);
        border-radius: 50%;
        background: var(--surface-subtle);
        color: var(--text-primary);
        font: inherit;
        font-size: 0.82rem;
        font-weight: 800;
        cursor: pointer;
        transition:
          border-color 0.16s ease,
          transform 0.16s ease;
      }
      .profile-trigger:hover {
        transform: translateY(-1px);
        border-color: var(--brand);
      }
      .profile-trigger img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .profile-trigger:focus-visible,
      .context-action:focus-visible,
      .theme-options button:focus-visible,
      .logout-button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--brand) 42%, transparent);
        outline-offset: 3px;
      }
      .profile-summary {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 2px 0 22px;
        border-bottom: 1px solid var(--border);
      }
      .profile-avatar {
        display: grid;
        width: 52px;
        height: 52px;
        flex: 0 0 52px;
        place-items: center;
        overflow: hidden;
        border-radius: 50%;
        background: var(--brand-soft);
        color: var(--brand);
        object-fit: cover;
        font-size: 1rem;
        font-weight: 850;
      }
      .profile-copy {
        display: grid;
        min-width: 0;
        gap: 5px;
      }
      .profile-copy strong {
        overflow: hidden;
        font-size: 0.96rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .profile-copy span {
        overflow: hidden;
        color: var(--text-secondary);
        font-size: 0.75rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .drawer-section {
        display: grid;
        gap: 9px;
        padding: 22px 0;
        border-bottom: 1px solid var(--border);
      }
      .section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 3px;
      }
      .section-heading h3 {
        margin: 0;
        font-size: 0.82rem;
        font-weight: 800;
      }
      .section-heading > span {
        color: var(--text-muted);
        font-size: 0.68rem;
      }
      .context-action {
        display: flex;
        width: 100%;
        min-height: 64px;
        align-items: center;
        gap: 12px;
        padding: 11px 12px;
        border: 1px solid var(--border);
        border-radius: 11px;
        background: var(--surface-card);
        color: var(--text-primary);
        text-align: left;
        cursor: pointer;
      }
      .context-action:hover,
      .context-action.is-active {
        border-color: var(--brand);
        background: var(--brand-soft);
      }
      .context-action:disabled {
        opacity: 0.58;
        cursor: wait;
      }
      .context-action-icon {
        display: grid;
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        place-items: center;
        border-radius: 10px;
        background: var(--surface-subtle);
        color: var(--brand);
        font-size: 1.1rem;
      }
      .context-action > span:nth-child(2) {
        display: grid;
        min-width: 0;
        flex: 1;
        gap: 4px;
      }
      .context-action strong {
        font-size: 0.8rem;
      }
      .context-action small {
        color: var(--text-secondary);
        font-size: 0.68rem;
        line-height: 1.4;
      }
      .selected-mark {
        color: var(--brand);
        font-size: 1rem;
        font-weight: 900;
      }
      .theme-options {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7px;
      }
      .theme-options button {
        display: flex;
        min-height: 42px;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 8px;
        border: 1px solid var(--border);
        border-radius: 9px;
        background: var(--surface-subtle);
        color: var(--text-secondary);
        font: inherit;
        font-size: 0.72rem;
        font-weight: 750;
        cursor: pointer;
      }
      .theme-options button.is-active {
        border-color: var(--brand);
        background: var(--brand-soft);
        color: var(--brand);
      }
      .drawer-status {
        padding: 10px 12px;
        border-radius: 8px;
        background: var(--surface-subtle);
        color: var(--text-secondary);
        font-size: 0.72rem;
      }
      .drawer-error {
        margin: 4px 0;
        padding: 10px 12px;
        border: 1px solid #d88a83;
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 0.72rem;
      }
      .retry-button {
        justify-self: start;
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface-subtle);
        color: var(--text-primary);
        font: inherit;
        font-size: 0.72rem;
        font-weight: 750;
        cursor: pointer;
      }
      .drawer-footer {
        display: grid;
        flex: 0 0 auto;
        gap: 10px;
        padding: 15px 24px calc(15px + env(safe-area-inset-bottom));
        border-top: 1px solid var(--border);
        background: var(--surface-card);
      }
      .logout-button {
        display: flex;
        min-height: 48px;
        align-items: center;
        justify-content: center;
        gap: 9px;
        border: 1px solid #d98a83;
        border-radius: 10px;
        background: transparent;
        color: #c34f47;
        font: inherit;
        font-size: 0.82rem;
        font-weight: 800;
        cursor: pointer;
      }
      .logout-button:disabled {
        opacity: 0.6;
        cursor: wait;
      }
      @media (max-width: 767.98px) {
        .profile-trigger {
          width: 39px;
          height: 39px;
        }
        .drawer-footer {
          padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .profile-trigger {
          transition: none;
        }
      }
    `,
  ],
})
export class UserProfileDrawerComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly workspace = inject(WorkspaceContextService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  readonly open = signal(false);
  readonly switching = signal(false);
  readonly switchError = signal('');
  readonly loggingOut = signal(false);
  readonly logoutError = signal('');
  readonly initials = computed(() =>
    (this.auth.user()?.full_name || 'BBG')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );
  readonly isPersonalContext = computed(
    () =>
      this.workspace.activeTenantId() === null &&
      !this.workspace.permissions().some((permission) => permission.scope_type === 'PLATFORM'),
  );
  readonly isPlatformContext = computed(
    () =>
      this.workspace.activeTenantId() === null &&
      this.workspace.permissions().some((permission) => permission.scope_type === 'PLATFORM'),
  );
  readonly hasPlatformAccess = computed(() =>
    this.workspace.platformPermissions().some((permission) => permission.scope_type === 'PLATFORM'),
  );

  toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  show(): void {
    this.open.set(true);
    void this.workspace.initialize().catch(() => undefined);
  }

  close(): void {
    this.open.set(false);
  }

  async goToMyAccount(): Promise<void> {
    await this.switchTo('PERSONAL');
  }

  async goToPlatformAdministration(): Promise<void> {
    await this.switchTo('PLATFORM');
  }

  async goToBusinessWorkspace(): Promise<void> {
    const tenantId =
      this.workspace.activeTenantId() ??
      this.workspace.lastActiveTenantId() ??
      this.workspace.tenants()[0]?.id ??
      null;
    if (tenantId === null) return;
    await this.switchTo(tenantId);
  }

  private async switchTo(context: 'PERSONAL' | 'PLATFORM' | number): Promise<void> {
    if (this.switching()) return;
    this.switching.set(true);
    this.switchError.set('');
    try {
      if (context === 'PERSONAL') await this.workspace.switchToMyAccount();
      else if (context === 'PLATFORM') await this.workspace.switchToPlatformAdministration();
      else await this.workspace.switchWorkspace(context);
      this.close();
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.switchError.set(
        error instanceof Error ? error.message : 'Unable to change your BBG area.',
      );
    } finally {
      this.switching.set(false);
    }
  }

  async reloadWorkspaces(): Promise<void> {
    try {
      await this.workspace.initialize();
    } catch {
      // The service exposes the error state in the drawer.
    }
  }

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.logoutError.set('');
    const path = this.document.defaultView?.location.pathname ?? '';
    const storefrontMatch = path.match(/^\/store\/([^/]+)/);
    const destination = storefrontMatch ? `/store/${storefrontMatch[1]}/login` : '/login';
    this.workspace.clear();
    try {
      await this.auth.logout();
    } catch (error) {
      this.logoutError.set(this.auth.errorMessage(error));
    } finally {
      this.close();
      await this.router.navigateByUrl(destination);
      this.loggingOut.set(false);
    }
  }
}
