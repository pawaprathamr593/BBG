import { DOCUMENT } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeMode, ThemeService } from '../../core/theme/theme.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';

@Component({
  selector: 'app-user-profile-drawer',
  standalone: true,
  template: `
    <button #trigger class="profile-trigger" type="button" aria-label="Open profile menu"
      aria-haspopup="dialog" [attr.aria-expanded]="open()" (click)="toggle()">
      @if (auth.user()?.profile_image; as image) {
        <img [src]="image" alt="" />
      } @else {
        <span>{{ initials() }}</span>
      }
    </button>

    @if (open()) {
      <div class="profile-backdrop" aria-hidden="true" (click)="close()"></div>
      <aside #drawer class="profile-drawer" role="dialog" aria-modal="true"
        aria-labelledby="profile-drawer-title">
        <header class="drawer-header">
          <div>
            <p class="drawer-eyebrow">YOUR BBG ACCOUNT</p>
            <h2 id="profile-drawer-title">Account</h2>
          </div>
          <button class="drawer-close" type="button" data-autofocus aria-label="Close profile menu"
            (click)="close()">×</button>
        </header>

        <div class="drawer-body">
          <section class="profile-summary">
            @if (auth.user()?.profile_image; as image) {
              <img class="profile-avatar" [src]="image" alt="" />
            } @else {
              <span class="profile-avatar profile-initials">{{ initials() }}</span>
            }
            <div class="profile-copy">
              <strong>{{ auth.user()?.full_name || 'BBG user' }}</strong>
              <span>{{ auth.user()?.email || auth.user()?.mobile || 'Account details' }}</span>
            </div>
          </section>

          @if (workspace.loading()) {
            <div class="drawer-status" role="status">Loading your workspaces…</div>
          } @else if (workspace.error()) {
            <div class="drawer-error" role="alert">{{ workspace.error() }}</div>
            <button class="retry-button" type="button" (click)="reloadWorkspaces()">Try again</button>
          } @else if (workspace.tenants().length) {
            <section class="drawer-section">
              <div class="section-heading">
                <h3>Switch workspace</h3>
                <span>{{ workspace.tenants().length }} available</span>
              </div>
              <button class="workspace-option" type="button"
                [class.is-active]="workspace.activeTenantId() === null"
                [disabled]="switching()"
                (click)="switchWorkspace(null)">
                <span class="workspace-symbol">◎</span>
                <span class="workspace-copy">
                  <strong>Personal / Platform</strong>
                  <small>Marketplace and platform context</small>
                </span>
                @if (workspace.activeTenantId() === null) { <span class="selected-mark">✓</span> }
              </button>
              @for (tenant of workspace.tenants(); track tenant.id) {
                <button class="workspace-option" type="button"
                  [class.is-active]="workspace.activeTenantId() === tenant.id"
                  [disabled]="switching()"
                  (click)="switchWorkspace(tenant.id)">
                  <span class="workspace-symbol">⌂</span>
                  <span class="workspace-copy">
                    <strong>{{ tenant.tenant_name }}</strong>
                    <small>{{ roleLabel(tenant.role_codes) }}</small>
                  </span>
                  @if (workspace.activeTenantId() === tenant.id) { <span class="selected-mark">✓</span> }
                </button>
              }
              @if (switching()) { <div class="drawer-status" role="status">Switching workspace and refreshing access…</div> }
              @if (switchError()) { <div class="drawer-error" role="alert">{{ switchError() }}</div> }
            </section>
          }

          <section class="drawer-section appearance-section">
            <div class="section-heading"><h3>Appearance</h3><span>Theme</span></div>
            <div class="theme-options" role="group" aria-label="Choose theme">
              <button type="button" [class.is-active]="theme.mode() === 'light'"
                [attr.aria-pressed]="theme.mode() === 'light'" (click)="setTheme('light')">
                <span aria-hidden="true">☀</span> Light
              </button>
              <button type="button" [class.is-active]="theme.mode() === 'dark'"
                [attr.aria-pressed]="theme.mode() === 'dark'" (click)="setTheme('dark')">
                <span aria-hidden="true">☾</span> Dark
              </button>
              <button type="button" [class.is-active]="theme.mode() === 'system'"
                [attr.aria-pressed]="theme.mode() === 'system'" (click)="setTheme('system')">
                <span aria-hidden="true">◐</span> System
              </button>
            </div>
          </section>
        </div>

        <footer class="drawer-footer">
          @if (logoutError()) { <p class="drawer-error" role="alert">{{ logoutError() }}</p> }
          <button class="logout-button" type="button" [disabled]="loggingOut()" (click)="logout()">
            <span aria-hidden="true">↪</span>
            {{ loggingOut() ? 'Signing out…' : 'Log out' }}
          </button>
        </footer>
      </aside>
    }
  `,
  styles: [`
    :host{display:inline-flex;align-items:center}
    .profile-trigger{display:grid;width:42px;height:42px;place-items:center;overflow:hidden;padding:0;border:2px solid var(--border);border-radius:50%;background:var(--surface-subtle);color:var(--text-primary);font:inherit;font-size:.82rem;font-weight:800;cursor:pointer;transition:border-color .16s ease,transform .16s ease}
    .profile-trigger:hover{transform:translateY(-1px);border-color:var(--brand)}
    .profile-trigger img{width:100%;height:100%;object-fit:cover}
    .profile-trigger:focus-visible,.drawer-close:focus-visible,.workspace-option:focus-visible,.theme-options button:focus-visible,.logout-button:focus-visible{outline:3px solid color-mix(in srgb,var(--brand) 42%,transparent);outline-offset:3px}
    .profile-backdrop{position:fixed;z-index:1000;inset:0;background:rgba(12,22,16,.48);backdrop-filter:blur(2px)}
    .profile-drawer{position:fixed;z-index:1001;inset-block:0;inset-inline-end:0;display:flex;width:clamp(20rem,34vw,30rem);max-width:100vw;height:100vh;height:100dvh;flex-direction:column;overflow:hidden;border-inline-start:1px solid var(--border);background:var(--surface-card);color:var(--text-primary);box-shadow:-18px 0 50px rgba(0,0,0,.18);animation:profile-drawer-in .2s ease-out}
    .drawer-header{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:16px;padding:22px 24px 18px;border-bottom:1px solid var(--border)}
    .drawer-eyebrow{margin:0 0 4px;color:var(--text-secondary);font-size:.62rem;font-weight:850;letter-spacing:.15em}
    .drawer-header h2{margin:0;font-size:1.35rem;letter-spacing:-.04em}
    .drawer-close{display:grid;width:40px;height:40px;place-items:center;border:1px solid var(--border);border-radius:10px;background:var(--surface-subtle);color:var(--text-primary);font-size:1.5rem;line-height:1;cursor:pointer}
    .drawer-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:22px 24px}
    .profile-summary{display:flex;align-items:center;gap:14px;padding:2px 0 22px;border-bottom:1px solid var(--border)}
    .profile-avatar{display:grid;width:52px;height:52px;flex:0 0 52px;place-items:center;overflow:hidden;border-radius:50%;background:var(--brand-soft);color:var(--brand);object-fit:cover;font-size:1rem;font-weight:850}
    .profile-copy{display:grid;min-width:0;gap:5px}.profile-copy strong{overflow:hidden;font-size:.96rem;text-overflow:ellipsis;white-space:nowrap}.profile-copy span{overflow:hidden;color:var(--text-secondary);font-size:.75rem;text-overflow:ellipsis;white-space:nowrap}
    .drawer-section{display:grid;gap:9px;padding:22px 0;border-bottom:1px solid var(--border)}
    .section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:3px}
    .section-heading h3{margin:0;font-size:.82rem;font-weight:800}.section-heading>span{color:var(--text-muted);font-size:.68rem}
    .workspace-option{display:flex;width:100%;min-height:62px;align-items:center;gap:12px;padding:10px 12px;border:1px solid transparent;border-radius:11px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}
    .workspace-option:hover,.workspace-option.is-active{border-color:var(--brand-soft);background:var(--brand-soft)}
    .workspace-option:disabled{opacity:.58;cursor:wait}
    .workspace-symbol{display:grid;width:36px;height:36px;flex:0 0 36px;place-items:center;border-radius:9px;background:var(--surface-subtle);color:var(--brand);font-size:1.05rem}
    .workspace-copy{display:grid;min-width:0;flex:1;gap:4px}.workspace-copy strong{overflow:hidden;font-size:.78rem;text-overflow:ellipsis;white-space:nowrap}.workspace-copy small{overflow:hidden;color:var(--text-secondary);font-size:.67rem;text-overflow:ellipsis;white-space:nowrap}
    .selected-mark{color:var(--brand);font-size:1rem;font-weight:900}
    .theme-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    .theme-options button{display:flex;min-height:42px;align-items:center;justify-content:center;gap:6px;padding:0 8px;border:1px solid var(--border);border-radius:9px;background:var(--surface-subtle);color:var(--text-secondary);font:inherit;font-size:.72rem;font-weight:750;cursor:pointer}
    .theme-options button.is-active{border-color:var(--brand);background:var(--brand-soft);color:var(--brand)}
    .drawer-status{padding:10px 12px;border-radius:8px;background:var(--surface-subtle);color:var(--text-secondary);font-size:.72rem}
    .drawer-error{margin:4px 0;padding:10px 12px;border:1px solid #d88a83;border-radius:8px;color:var(--text-primary);font-size:.72rem}
    .retry-button{justify-self:start;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-subtle);color:var(--text-primary);font:inherit;font-size:.72rem;font-weight:750;cursor:pointer}
    .drawer-footer{display:grid;flex:0 0 auto;gap:10px;padding:15px 24px calc(15px + env(safe-area-inset-bottom));border-top:1px solid var(--border);background:var(--surface-card)}
    .logout-button{display:flex;min-height:48px;align-items:center;justify-content:center;gap:9px;border:1px solid #d98a83;border-radius:10px;background:transparent;color:#c34f47;font:inherit;font-size:.82rem;font-weight:800;cursor:pointer}
    .logout-button:disabled{opacity:.6;cursor:wait}
    @keyframes profile-drawer-in{from{opacity:.75;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
    @media(min-width:768px) and (max-width:1023.98px){.profile-drawer{width:min(80vw,27.5rem)}}
    @media(max-width:767.98px){.profile-trigger{width:39px;height:39px}.profile-drawer{inset:0;width:100%;max-width:100%;height:100vh;height:100dvh;border:0;box-shadow:none;animation:profile-drawer-in .16s ease-out}.drawer-header{padding:calc(14px + env(safe-area-inset-top)) 18px 14px}.drawer-body{padding:18px}.drawer-footer{padding:12px 18px calc(12px + env(safe-area-inset-bottom))}}
    @media(prefers-reduced-motion:reduce){.profile-trigger,.profile-drawer{transition:none;animation:none}}
  `],
})
export class UserProfileDrawerComponent implements AfterViewChecked, OnDestroy {
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
  readonly initials = computed(() => (this.auth.user()?.full_name || 'BBG')
    .trim().split(/\\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join(''));

  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('drawer') private drawer?: ElementRef<HTMLElement>;

  private previousBodyOverflow = '';
  private focusPending = false;

  toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  show(): void {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.open.set(true);
    this.focusPending = true;
    void this.workspace.initialize().catch(() => undefined);
  }

  close(): void {
    this.open.set(false);
    this.document.body.style.overflow = this.previousBodyOverflow;
    this.trigger?.nativeElement.focus();
  }

  ngAfterViewChecked(): void {
    if (this.open() && this.focusPending && this.drawer) {
      this.drawer.nativeElement.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      this.focusPending = false;
    }
  }

  ngOnDestroy(): void {
    if (this.open()) this.document.body.style.overflow = this.previousBodyOverflow;
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab' || !this.drawer) return;
    const focusable = Array.from(this.drawer.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async switchWorkspace(tenantId: number | null): Promise<void> {
    if (this.switching()) return;
    this.switching.set(true);
    this.switchError.set('');
    try {
      await this.workspace.switchWorkspace(tenantId);
      this.close();
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.switchError.set(error instanceof Error ? error.message : 'Workspace could not be changed.');
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

  roleLabel(roles: string | null): string {
    if (!roles) return 'Workspace access';
    return roles.split(',').map((role) => role.trim().toLowerCase()
      .split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')).filter(Boolean).join(' · ');
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.logoutError.set('');
    const path = this.document.defaultView?.location.pathname ?? '';
    const storefrontMatch = path.match(/^\\/store\\/([^/]+)/);
    const destination = storefrontMatch ? `/store/${storefrontMatch[1]}/login` : '/login';
    try {
      await this.auth.logout();
    } catch (error) {
      this.logoutError.set(this.auth.errorMessage(error));
    } finally {
      this.workspace.tenants.set([]);
      this.workspace.permissions.set([]);
      this.workspace.activeTenantId.set(null);
      this.close();
      await this.router.navigateByUrl(destination);
      this.loggingOut.set(false);
    }
  }
}
