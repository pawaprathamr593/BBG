import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import { UserProfileDrawerComponent } from '../../shared/user-profile-drawer/user-profile-drawer';
import { FilterDrawer } from '../../shared/filter-drawer/filter-drawer';
import { WorkspaceNavIconComponent } from './workspace-nav-icon';

interface WorkspaceNavItem {
  label: string;
  route: string;
  permission: string | null;
  scope: 'TENANT' | 'PLATFORM' | 'GLOBAL' | 'ANY';
  icon: string;
}

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UserProfileDrawerComponent, FilterDrawer, WorkspaceNavIconComponent],
  template: `
    <div class="workspace-shell" [class.sidebar-collapsed]="sidebarCollapsed()" [class.mobile-expanded]="mobileExpanded()">
      <header class="workspace-topbar">
        <a class="workspace-brand" routerLink="/dashboard" [attr.aria-label]="contextLabel() + ' overview'">
          <span class="brand-mark"><i></i><i></i><i></i></span>
          <span class="brand-copy"><strong>BBG</strong><small>{{ contextLabel() }}</small></span>
        </a>

        <div class="topbar-spacer"></div>
        <a class="marketplace-link" routerLink="/" title="Return to marketplace"><span>↗</span><span>Marketplace</span></a>
        <div class="desktop-profile"><app-user-profile-drawer /></div>
      </header>

      <div class="workspace-body">
        <aside class="workspace-sidebar" [attr.aria-label]="contextLabel() + ' navigation'">
          @if (showContextSwitcher()) {
            <div class="sidebar-context-switcher">
              <label>
                <span>SWITCH AREA</span>
                <select [value]="activeContextSelection()" [disabled]="contextSwitching()" (change)="switchContext($event)" aria-label="Switch account area">
                  <option value="PERSONAL">My Account</option>
                  @if (canAccessPlatform()) { <option value="PLATFORM">Platform Administration</option> }
                  @for (tenant of workspace.tenants(); track tenant.id; let index = $index) {
                    <option [value]="'BUSINESS:' + tenant.id">{{ tenant.tenant_name || ('Business Workspace ' + (index + 1)) }}</option>
                  }
                </select>
              </label>
              @if (contextSwitchError()) { <span class="context-switch-error" role="alert">{{ contextSwitchError() }}</span> }
            </div>
          }
          <div class="sidebar-scroll">
            <p class="sidebar-caption" [class.visually-hidden]="sidebarCollapsed()">{{ contextLabel() }}</p>
            <a class="nav-item overview-link" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" [attr.title]="sidebarCollapsed() ? overviewLabel() : null">
              <span class="nav-icon"><app-workspace-nav-icon name="layout-dashboard" /></span><span class="nav-label">{{ overviewLabel() }}</span>
            </a>
            <div class="nav-divider"></div>
            <p class="sidebar-caption" [class.visually-hidden]="sidebarCollapsed()">{{ navSectionLabel() }}</p>
            @for (item of visibleNavItems(); track item.route) {
              <a class="nav-item" [routerLink]="item.route" routerLinkActive="active" [attr.title]="sidebarCollapsed() ? item.label : null">
                <span class="nav-icon"><app-workspace-nav-icon [name]="item.icon" /></span><span class="nav-label">{{ item.label }}</span>
              </a>
            }
            @if (!visibleNavItems().length) {
              <p class="sidebar-empty" [class.visually-hidden]="sidebarCollapsed()">No modules are assigned in this area.</p>
            }
          </div>
          <button class="sidebar-collapse" type="button" (click)="sidebarCollapsed.update(v => !v)" [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'" [attr.title]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            <span>{{ sidebarCollapsed() ? '»' : '«' }}</span><span class="nav-label">{{ sidebarCollapsed() ? 'Expand' : 'Collapse sidebar' }}</span>
          </button>
        </aside>

        <main class="workspace-main">
          <div class="breadcrumb-row" aria-label="Breadcrumb">
            <div class="breadcrumbs">
              <a routerLink="/dashboard">{{ contextLabel() }}</a>
              @for (crumb of breadcrumbs(); track crumb.route; let last = $last) {
                <span class="crumb-separator">/</span>
                @if (last) { <span class="current-crumb" aria-current="page">{{ crumb.label }}</span> }
                @else { <a [routerLink]="crumb.route">{{ crumb.label }}</a> }
              }
            </div>
          </div>
          <section class="workspace-content" [attr.aria-label]="currentPageLabel()">
            <router-outlet />
          </section>
        </main>
      </div>

      @if (hasPageFilters()) {
        <app-filter-drawer
          [open]="filterDrawerOpen()"
          [activeCount]="activeFilterCount()"
          (openChange)="setFilterDrawerOpen($event)"
          (apply)="applyFilters()"
          (reset)="resetDraftFilters()">
          <div class="workspace-filter-fields">
            @if (filterFields().includes('search')) {
              <label class="filter-field">Search<input type="search" [value]="draftFilters().search" (input)="setDraftFilter('search',$event)" placeholder="Search records"></label>
            }
            @if (filterFields().includes('status')) {
              <label class="filter-field">Status<select [value]="draftFilters().status" (change)="setDraftFilter('status',$event)"><option value="">All statuses</option>@for (status of statusOptions(); track status) { <option [value]="status">{{ status }}</option> }</select></label>
            }
            @if (filterFields().includes('from')) {
              <label class="filter-field">From date<input type="date" [value]="draftFilters().from" (change)="setDraftFilter('from',$event)"></label>
            }
            @if (filterFields().includes('to')) {
              <label class="filter-field">To date<input type="date" [value]="draftFilters().to" (change)="setDraftFilter('to',$event)"></label>
            }
          </div>
        </app-filter-drawer>
      }

      <section class="mobile-nav-panel" [class.expanded]="mobileExpanded()" [attr.aria-label]="contextLabel() + ' navigation'">
        <button class="mobile-nav-handle" type="button" (click)="mobileExpanded.update(v => !v)" [attr.aria-expanded]="mobileExpanded()">
          <span class="handle-line"></span><strong>{{ mobileExpanded() ? contextLabel() + ' navigation' : 'Navigate ' + contextLabel() }}</strong><span class="handle-chevron">{{ mobileExpanded() ? '⌄' : '⌃' }}</span>
        </button>
        @if (mobileExpanded()) {
          @if (showContextSwitcher()) {
            <div class="mobile-context-switcher" aria-label="Switch account area">
              <div class="mobile-context-heading">
                <div><span>SWITCH AREA</span><strong>{{ contextSwitching() ? 'Switching area…' : 'Choose where to work' }}</strong></div>
                <span class="mobile-context-current">{{ activeContextSelection() === 'PERSONAL' ? 'PERSONAL' : activeContextSelection() === 'PLATFORM' ? 'PLATFORM' : 'BUSINESS' }}</span>
              </div>
              <div class="mobile-context-options">
                <button type="button" class="mobile-context-option" [class.active]="activeContextSelection() === 'PERSONAL'" [disabled]="contextSwitching()" [attr.aria-pressed]="activeContextSelection() === 'PERSONAL'" (click)="switchContextSelection('PERSONAL')">
                  <span class="mobile-context-option-icon"><app-workspace-nav-icon name="contact-round" /></span><span><strong>My Account</strong><small>Personal orders, enquiries and profile</small></span><span class="mobile-context-check">✓</span>
                </button>
                @if (canAccessPlatform()) {
                  <button type="button" class="mobile-context-option" [class.active]="activeContextSelection() === 'PLATFORM'" [disabled]="contextSwitching()" [attr.aria-pressed]="activeContextSelection() === 'PLATFORM'" (click)="switchContextSelection('PLATFORM')">
                    <span class="mobile-context-option-icon"><app-workspace-nav-icon name="shield-check" /></span><span><strong>Platform Administration</strong><small>Manage the BBG platform</small></span><span class="mobile-context-check">✓</span>
                  </button>
                }
                @for (tenant of workspace.tenants(); track tenant.id; let index = $index) {
                  <button type="button" class="mobile-context-option" [class.active]="activeContextSelection() === 'BUSINESS:' + tenant.id" [disabled]="contextSwitching()" [attr.aria-pressed]="activeContextSelection() === 'BUSINESS:' + tenant.id" (click)="switchContextSelection('BUSINESS:' + tenant.id)">
                    <span class="mobile-context-option-icon"><app-workspace-nav-icon name="store" /></span><span><strong>{{ tenant.tenant_name || ('Business Workspace ' + (index + 1)) }}</strong><small>Business workspace</small></span><span class="mobile-context-check">✓</span>
                  </button>
                }
              </div>
              @if (contextSwitchError()) { <span class="context-switch-error mobile-context-error" role="alert">{{ contextSwitchError() }}</span> }
            </div>
          }
          <div class="mobile-nav-scroll">
            <a class="mobile-nav-item" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="mobileExpanded.set(false)"><span><app-workspace-nav-icon name="layout-dashboard" /></span>{{ overviewLabel() }}</a>
            @for (item of visibleNavItems(); track item.route) {
              <a class="mobile-nav-item" [routerLink]="item.route" routerLinkActive="active" (click)="mobileExpanded.set(false)"><span><app-workspace-nav-icon [name]="item.icon" /></span>{{ item.label }}</a>
            }
          </div>
        } @else {
          <div class="mobile-quick-nav">
            <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="mobileExpanded.set(false)"><span><app-workspace-nav-icon name="layout-dashboard" /></span><small>{{ overviewLabel() }}</small></a>
            @for (item of visibleNavItems().slice(0,3); track item.route) {
              <a [routerLink]="item.route" routerLinkActive="active" (click)="mobileExpanded.set(false)"><span><app-workspace-nav-icon [name]="item.icon" /></span><small>{{ item.label }}</small></a>
            }
            <button type="button" (click)="mobileExpanded.set(true)"><span>•••</span><small>All modules</small></button>
          </div>
        }
      </section>


    </div>
  `,
  styles: [`
    :host{display:block;width:100%;height:100%;min-height:100dvh;color:var(--text-primary)}
    .workspace-shell{--workspace-topbar:72px;--bbg-header-height:72px;--bbg-filter-fab-bottom:max(86px,calc(env(safe-area-inset-bottom) + 82px));--sidebar-width:258px;position:relative;display:flex;width:100%;height:100dvh;min-height:0;flex-direction:column;overflow:hidden;background:var(--surface-page)}
    .workspace-topbar{position:relative;z-index:1002;display:flex;flex:0 0 var(--workspace-topbar);height:var(--workspace-topbar);align-items:center;gap:18px;padding:0 26px;background:var(--surface-header);border-bottom:1px solid var(--border);box-shadow:0 2px 12px rgba(15,35,24,.035)}
    .workspace-brand{display:flex;flex:0 0 190px;align-items:center;gap:10px;color:var(--text-primary);text-decoration:none}
    .brand-mark{position:relative;display:block;width:36px;height:36px;overflow:hidden;border-radius:9px;background:#174d35}
    .brand-mark i{position:absolute;width:42px;height:6px;left:3px;background:#fff;border-radius:5px;transform:rotate(-42deg)}.brand-mark i:nth-child(1){top:7px}.brand-mark i:nth-child(2){top:16px;left:-4px}.brand-mark i:nth-child(3){top:25px;background:#f5d928}
    .brand-copy{display:grid;gap:0}.brand-copy strong{font-size:1.5rem;line-height:1;font-weight:850;letter-spacing:-.07em}.brand-copy small{margin-top:3px;color:var(--text-secondary);font-size:.53rem;font-weight:850;letter-spacing:.16em}
    .workspace-identity{display:flex;min-width:160px;align-items:center;gap:10px;padding-left:18px;border-left:1px solid var(--border)}
    .identity-icon{display:grid;width:36px;height:36px;flex:0 0 36px;place-items:center;border-radius:10px;background:var(--brand-soft);color:var(--brand);font-size:1.1rem}
    .identity-copy{display:grid;min-width:0;gap:3px}.identity-copy small{color:var(--text-secondary);font-size:.56rem;font-weight:850;letter-spacing:.1em}.identity-copy strong{max-width:230px;overflow:hidden;font-size:.81rem;text-overflow:ellipsis;white-space:nowrap}
    .workspace-switcher{position:relative;display:grid;min-width:185px;gap:4px;color:var(--text-secondary);font-size:.59rem;font-weight:750}
    .workspace-switcher select{width:100%;height:36px;appearance:none;padding:0 30px 0 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-card);color:var(--text-primary);font:inherit;font-size:.72rem;cursor:pointer}
    .switch-chevron{position:absolute;right:11px;bottom:7px;pointer-events:none;font-size:.9rem}
    .topbar-spacer{flex:1}.marketplace-link{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);font-size:.7rem;font-weight:750;text-decoration:none;white-space:nowrap}.marketplace-link:hover{border-color:var(--brand);color:var(--brand)}
    .switch-error{max-width:210px;color:#c34f47;font-size:.65rem}
    .workspace-body{display:flex;flex:1 1 auto;min-height:0;overflow:hidden}
    .responsive-workspace-nav{display:none}
    .responsive-context-switcher{display:grid;flex:0 0 190px;gap:4px;padding:0 12px 0 0;color:var(--text-muted);font-size:.55rem;font-weight:850;letter-spacing:.1em}
    .responsive-context-switcher select{width:100%;height:38px;min-width:0;padding:0 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface-card);color:var(--text-primary);font:inherit;font-size:.68rem;letter-spacing:0}
    .responsive-nav-item{display:inline-flex;min-height:40px;flex:0 0 auto;align-items:center;gap:8px;padding:0 12px;border:1px solid transparent;border-radius:8px;color:var(--text-secondary);font-size:.7rem;font-weight:700;text-decoration:none;white-space:nowrap}
    .responsive-nav-item.active{border-color:color-mix(in srgb,var(--brand) 28%,transparent);background:var(--brand-soft);color:var(--brand)}
    .responsive-nav-item .nav-icon{width:18px;height:18px;flex-basis:18px}.responsive-nav-item app-workspace-nav-icon{display:block;width:18px;height:18px}
    .workspace-sidebar{z-index:10;display:flex;width:var(--sidebar-width);flex:0 0 var(--sidebar-width);flex-direction:column;overflow:hidden;border-right:1px solid var(--border);background:var(--surface-card);transition:width .2s ease,flex-basis .2s ease}
    .sidebar-collapsed .workspace-sidebar{width:76px;flex-basis:76px}
    .sidebar-context-switcher{padding:14px 12px;border-bottom:1px solid var(--border)}.sidebar-context-switcher label{display:grid;gap:6px;color:var(--text-muted);font-size:.57rem;font-weight:850;letter-spacing:.12em}.sidebar-context-switcher select{width:100%;height:39px;min-width:0;padding:0 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.7rem;letter-spacing:0;cursor:pointer}.sidebar-context-switcher select:disabled{opacity:.6;cursor:wait}.context-switch-error{display:block;margin-top:6px;color:#c34f47;font-size:.64rem}
    .sidebar-collapsed .sidebar-context-switcher{padding:10px 7px}.sidebar-collapsed .sidebar-context-switcher label>span{display:none}.sidebar-collapsed .sidebar-context-switcher select{padding:0 3px;font-size:.59rem}
    .sidebar-scroll{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:20px 12px 12px}
    .sidebar-caption{margin:2px 11px 10px;color:var(--text-muted);font-size:.57rem;font-weight:850;letter-spacing:.13em;white-space:nowrap}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
    .nav-item{display:flex;min-height:43px;align-items:center;gap:13px;margin:3px 0;padding:0 12px;border:1px solid transparent;border-radius:9px;color:var(--text-secondary);font-size:.77rem;font-weight:650;text-decoration:none;white-space:nowrap;transition:background .15s ease,color .15s ease}
    .nav-item:hover{background:var(--surface-subtle);color:var(--text-primary)}.nav-item.active{border-color:color-mix(in srgb,var(--brand) 22%,transparent);background:var(--brand-soft);color:var(--brand);font-weight:800}
    .nav-icon{display:grid;width:22px;height:22px;flex:0 0 22px;place-items:center;color:currentColor}.nav-icon app-workspace-nav-icon{display:block;width:20px;height:20px}.mobile-nav-item app-workspace-nav-icon,.mobile-quick-nav app-workspace-nav-icon{display:block;width:20px;height:20px}.nav-label{overflow:hidden;text-overflow:ellipsis}
    .nav-divider{height:1px;margin:12px 7px 17px;background:var(--border)}
    .sidebar-empty{padding:0 11px;color:var(--text-muted);font-size:.7rem;line-height:1.5}
    .sidebar-collapse{display:flex;min-height:54px;align-items:center;gap:13px;padding:0 23px;border:0;border-top:1px solid var(--border);background:var(--surface-card);color:var(--text-secondary);font:inherit;font-size:.72rem;font-weight:750;text-align:left;cursor:pointer}.sidebar-collapse>span:first-child{font-size:1.1rem}
    .workspace-main{display:flex;min-width:0;flex:1;flex-direction:column;overflow:hidden}
    .breadcrumb-row{z-index:5;display:flex;min-height:54px;flex:0 0 54px;align-items:center;justify-content:space-between;gap:15px;padding:0 32px;border-bottom:1px solid var(--border);background:var(--surface-page)}
    .breadcrumbs{display:flex;min-width:0;align-items:center;gap:9px;overflow:hidden;color:var(--text-muted);font-size:.7rem;white-space:nowrap}.breadcrumbs a{color:var(--text-secondary);text-decoration:none}.breadcrumbs a:hover{color:var(--brand)}.crumb-separator{color:var(--text-muted)}.current-crumb{overflow:hidden;color:var(--text-primary);font-weight:750;text-overflow:ellipsis}
    .workspace-content{min-height:0;flex:1;overflow:auto;overscroll-behavior:contain}
    .mobile-nav-panel,.mobile-nav-backdrop{display:none}.desktop-profile{display:flex;align-items:center}
    @media(max-width:1100px){.workspace-brand{flex-basis:130px}.workspace-topbar{gap:12px;padding:0 18px}.workspace-identity{padding-left:12px}.identity-copy strong{max-width:170px}}
    .workspace-filter-fields{display:grid;grid-template-columns:1fr;gap:16px}.workspace-filter-fields .filter-field{display:grid;gap:7px;margin:0;color:var(--text-primary);font-size:.74rem;font-weight:750}.workspace-filter-fields .filter-field input,.workspace-filter-fields .filter-field select{width:100%;height:44px;box-sizing:border-box;padding:0 11px;border:1px solid var(--border);border-radius:8px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.77rem}
    @media(max-width:767.98px){.workspace-shell{--workspace-topbar:66px;--bbg-header-height:66px}.workspace-topbar{gap:10px;padding:0 14px}.workspace-brand{flex-basis:auto}.brand-copy small{display:none}.workspace-identity{min-width:0;flex:1;padding-left:12px}.identity-copy strong{max-width:190px}.workspace-switcher{min-width:150px}.workspace-switcher>span:first-child{display:none}.marketplace-link{padding:8px}.marketplace-link>span:last-child{display:none}.workspace-sidebar{display:none}.desktop-profile{display:flex;align-items:center}.breadcrumb-row{min-height:48px;flex-basis:48px;padding:0 17px}.workspace-content{padding-bottom:82px}.mobile-nav-panel{position:fixed;z-index:61;right:0;bottom:0;left:0;display:flex;max-height:66px;flex-direction:column;overflow:hidden;padding-bottom:env(safe-area-inset-bottom);border:1px solid var(--border);border-bottom:0;border-radius:18px 18px 0 0;background:var(--surface-card);box-shadow:0 -14px 44px rgba(0,0,0,.17);transition:max-height .22s ease}.mobile-nav-panel.expanded{max-height:min(62vh,540px)}.mobile-nav-handle{display:grid;min-height:66px;flex:0 0 66px;grid-template-columns:1fr auto 1fr;align-items:center;padding:6px 20px;border:0;background:transparent;color:var(--text-primary);font:inherit;cursor:pointer}.handle-line{width:35px;height:4px;justify-self:start;border-radius:5px;background:var(--border)}.mobile-nav-handle strong{font-size:.77rem}.handle-chevron{justify-self:end;color:var(--text-secondary);font-size:1.1rem}.mobile-quick-nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;padding:0 10px 12px}.mobile-quick-nav a,.mobile-quick-nav button{display:grid;min-width:0;justify-items:center;gap:5px;padding:7px 2px;border:0;border-radius:8px;background:transparent;color:var(--text-secondary);text-decoration:none;font:inherit}.mobile-quick-nav a.active{background:var(--brand-soft);color:var(--brand)}.mobile-quick-nav span{font-size:1.08rem}.mobile-quick-nav app-workspace-nav-icon{width:20px;height:20px}.mobile-quick-nav small{max-width:100%;overflow:hidden;font-size:.58rem;text-overflow:ellipsis;white-space:nowrap}.mobile-quick-nav button{cursor:pointer}.mobile-workspace-controls{display:flex;align-items:center;gap:9px;padding:0 14px 12px;border-bottom:1px solid var(--border)}.mobile-workspace-switcher{display:grid;min-width:0;flex:1;gap:4px;color:var(--text-secondary);font-size:.58rem;font-weight:800}.mobile-workspace-switcher select{width:100%;height:39px;min-width:0;padding:0 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.68rem}.mobile-filter-trigger{display:inline-flex;min-height:39px;align-items:center;gap:6px;padding:0 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.68rem;font-weight:750;white-space:nowrap;cursor:pointer}.mobile-filter-trigger b{display:grid;min-width:16px;height:16px;place-items:center;border-radius:50%;background:var(--brand);color:white;font-size:.58rem}.mobile-profile{display:flex;flex:0 0 auto;align-items:center}.mobile-profile app-user-profile-drawer{display:inline-flex}.mobile-context-switcher{padding:0 16px 12px;border-bottom:1px solid var(--border)}.mobile-context-switcher label{display:grid;gap:5px;color:var(--text-secondary);font-size:.65rem;font-weight:800}.mobile-context-switcher select{width:100%;height:40px;padding:0 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.75rem}
    .mobile-context-switcher{display:grid;gap:11px;padding:15px 16px 13px;border-bottom:1px solid var(--border);background:var(--surface-card)}.mobile-context-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.mobile-context-heading>div{display:grid;gap:3px}.mobile-context-heading>div>span{color:var(--text-muted);font-size:.57rem;font-weight:850;letter-spacing:.12em}.mobile-context-heading strong{color:var(--text-primary);font-size:.79rem}.mobile-context-current{padding:4px 7px;border-radius:6px;background:var(--brand-soft);color:var(--brand);font-size:.54rem;font-weight:850;letter-spacing:.06em}.mobile-context-options{display:grid;grid-template-columns:1fr;gap:7px;max-height:26vh;overflow-y:auto;overscroll-behavior:contain}.mobile-context-option{display:grid;grid-template-columns:34px minmax(0,1fr) 20px;min-height:54px;align-items:center;gap:10px;padding:7px 10px;border:1px solid var(--border);border-radius:10px;background:var(--surface-page);color:var(--text-secondary);text-align:left;font:inherit;cursor:pointer}.mobile-context-option>span:nth-child(2){display:grid;min-width:0;gap:3px}.mobile-context-option strong{overflow:hidden;color:var(--text-primary);font-size:.72rem;text-overflow:ellipsis;white-space:nowrap}.mobile-context-option small{color:var(--text-muted);font-size:.6rem}.mobile-context-option-icon{display:grid;width:32px;height:32px;place-items:center;border-radius:8px;background:var(--surface-subtle);color:var(--text-secondary)}.mobile-context-option-icon app-workspace-nav-icon{width:19px;height:19px}.mobile-context-check{visibility:hidden;color:var(--brand);font-size:.9rem;font-weight:900}.mobile-context-option.active{border-color:var(--brand);background:var(--brand-soft)}.mobile-context-option.active .mobile-context-option-icon{background:var(--surface-card);color:var(--brand)}.mobile-context-option.active .mobile-context-check{visibility:visible}.mobile-context-option:disabled{opacity:.58;cursor:wait}.mobile-context-error{padding:0 2px}.mobile-nav-scroll{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;overflow:auto;padding:12px 16px 18px}.mobile-nav-item{display:flex;min-height:43px;align-items:center;gap:10px;padding:0 12px;border:1px solid var(--border);border-radius:9px;color:var(--text-secondary);font-size:.73rem;text-decoration:none}.mobile-nav-item.active{border-color:var(--brand);background:var(--brand-soft);color:var(--brand);font-weight:800}.mobile-nav-item>span{display:grid;width:20px;flex:0 0 20px;place-items:center;color:var(--brand)}.mobile-nav-item app-workspace-nav-icon{width:19px;height:19px}}

    @media(min-width:768px) and (max-width:820px){.workspace-topbar{gap:10px;padding:0 14px}.workspace-brand{flex:0 0 112px}.brand-copy small{display:none}.workspace-identity{min-width:0;flex:1;padding-left:12px}.identity-copy strong{max-width:145px}.workspace-switcher{min-width:145px}.marketplace-link{padding:8px}.marketplace-link>span:last-child{display:none}}
    @media(max-width:540px){.workspace-topbar{gap:8px;padding:0 10px}.brand-mark{width:32px;height:32px}.brand-copy strong{font-size:1.3rem}.workspace-identity{gap:7px;padding-left:8px}.identity-icon{width:31px;height:31px;flex-basis:31px}.identity-copy small{font-size:.48rem}.identity-copy strong{max-width:115px;font-size:.7rem}.workspace-switcher{min-width:112px}.workspace-switcher select{font-size:.64rem}.marketplace-link{display:none}.mobile-nav-scroll{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.workspace-sidebar,.mobile-nav-panel{transition:none;animation:none}}
  `],
})
export class WorkspaceLayout implements OnInit {
  readonly workspace = inject(WorkspaceContextService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidebarCollapsed = signal(false);
  readonly mobileExpanded = signal(false);
  readonly filterDrawerOpen = signal(false);
  readonly draftFilters = signal({ search: '', status: '', from: '', to: '' });
  readonly activeFilters = signal({ search: '', status: '', from: '', to: '' });
  readonly activeTenantId = this.workspace.activeTenantId;
  readonly permissions = this.workspace.permissions;
  readonly activeContext = this.workspace.activeContext;
  readonly isPlatform = computed(() => this.activeTenantId() === null && this.activeContext() === 'PLATFORM');
  readonly isPersonalContext = computed(() => this.activeTenantId() === null && this.activeContext() === 'PERSONAL');
  readonly contextLabel = computed(() => this.activeTenantId() !== null ? 'BUSINESS WORKSPACE' : this.isPlatform() ? 'PLATFORM ADMINISTRATION' : 'MY ACCOUNT');
  readonly overviewLabel = computed(() => this.isPersonalContext() ? 'My Account Overview' : this.isPlatform() ? 'Platform Overview' : 'Overview');
  readonly navSectionLabel = computed(() => this.isPersonalContext() ? 'MY ACCOUNT' : this.isPlatform() ? 'ADMINISTRATION' : 'BUSINESS TOOLS');
  readonly canAccessPlatform = computed(() => this.workspace.platformPermissions().some((permission) => permission.scope_type === 'PLATFORM'));
  readonly showContextSwitcher = computed(() => this.workspace.tenants().length > 0 || this.canAccessPlatform());
  readonly activeContextSelection = computed(() => this.activeTenantId() !== null
    ? 'BUSINESS:' + this.activeTenantId()
    : this.isPlatform() ? 'PLATFORM' : 'PERSONAL');
  readonly contextSwitching = signal(false);
  readonly contextSwitchError = signal('');
  readonly currentPath = signal(this.router.url.split(/[?#]/,1)[0]);
  readonly currentSection = computed(() => this.currentPath().split('/').filter(Boolean).at(-1) ?? 'dashboard');
  readonly currentPageLabel = computed(() => this.currentSection() === 'dashboard' ? 'Overview' : this.currentSection().replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()));
  readonly breadcrumbs = computed(() => {
    const parts = this.currentPath().split('/').filter(Boolean).slice(1);
    const labels = parts.map((part) => part === 'catalogue' ? 'Catalogue' : part.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase()));
    return labels.map((label, index) => ({ label, route: '/dashboard/' + parts.slice(0,index + 1).join('/') }));
  });
  readonly filterFields = computed(() => {
    const section = this.currentSection();
    if (['orders','enquiries','payments','promotions','customers'].includes(section)) return ['search','status','from','to'];
    if (section === 'catalogue') return ['search','status'];
    if (['members','subscriptions','categories','platform-users','business-approval','subscription-approval','moderation'].includes(section)) return ['search','status'];
    return [];
  });
  readonly hasPageFilters = computed(() => this.filterFields().length > 0);
  readonly activeFilterCount = computed(() => { const filters = this.activeFilters(); return [filters.status, filters.from, filters.to].filter(Boolean).length; });
  readonly statusOptions = computed(() => {
    const s = this.currentSection();
    if (s === 'orders') return ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'];
    if (s === 'payments') return ['PENDING','PAID','FAILED','REFUNDED'];
    if (s === 'promotions') return ['DRAFT','PUBLISHED','UNPUBLISHED','EXPIRED'];
    if (s === 'enquiries') return ['OPEN','IN_PROGRESS','RESPONDED','CLOSED'];
    if (s === 'customers') return ['ACTIVE','INACTIVE'];
    if (s === 'catalogue') return ['DRAFT','PUBLISHED'];
    return ['ACTIVE','INACTIVE','PENDING','APPROVED','REJECTED'];
  });
  readonly visibleNavItems = computed<WorkspaceNavItem[]>(() => {
    const scope = this.activeTenantId() !== null ? ['TENANT'] : this.activeContext() === 'PLATFORM' ? ['PLATFORM'] : ['GLOBAL'];
    const perms = this.permissions();
    const available = (permission: string | null, itemScope: WorkspaceNavItem['scope']) => {
      if (!permission) return true;
      return perms.some((p) => p.permission_code === permission && (itemScope === 'ANY' || p.scope_type === itemScope));
    };
    const items: WorkspaceNavItem[] = [
      {label:'Profile & storefront',route:'/dashboard/profile',permission:'BUSINESS_PROFILE_MANAGE',scope:'TENANT',icon:'store'},
      {label:'Catalogue',route:'/dashboard/catalogue',permission:'CATALOGUE_MANAGE',scope:'TENANT',icon:'package'},
      {label:'Customers',route:'/dashboard/customers',permission:'CUSTOMERS_MANAGE',scope:'TENANT',icon:'users'},
      {label:'Enquiries',route:'/dashboard/enquiries',permission:'ENQUIRIES_MANAGE',scope:'TENANT',icon:'message-square'},
      {label:'Orders',route:'/dashboard/orders',permission:'ORDERS_MANAGE',scope:'TENANT',icon:'shopping-bag'},
      {label:'Payments',route:'/dashboard/payments',permission:'PAYMENTS_VIEW',scope:'TENANT',icon:'wallet'},
      {label:'Promotions',route:'/dashboard/promotions',permission:'PROMOTIONS_MANAGE',scope:'TENANT',icon:'megaphone'},
      {label:'Subscriptions',route:'/dashboard/subscriptions',permission:'SUBSCRIPTIONS_MANAGE',scope:'TENANT',icon:'badge-check'},
      {label:'Team & access',route:'/dashboard/members',permission:'TENANT_MEMBERS_VIEW',scope:'TENANT',icon:'users-round'},
      {label:'Analytics',route:'/dashboard/analytics',permission:'ANALYTICS_VIEW',scope:'TENANT',icon:'chart-no-axes-combined'},
      {label:'Platform users',route:'/dashboard/platform-users',permission:'PLATFORM_USERS_MANAGE',scope:'PLATFORM',icon:'user-cog'},
      {label:'Business approvals',route:'/dashboard/business-approval',permission:'BUSINESS_APPROVE',scope:'PLATFORM',icon:'building-check'},
      {label:'Subscription approvals',route:'/dashboard/subscription-approval',permission:'SUBSCRIPTIONS_APPROVE',scope:'PLATFORM',icon:'credit-card'},
      {label:'Marketplace categories',route:'/dashboard/categories',permission:'CATEGORIES_MANAGE',scope:'PLATFORM',icon:'tags'},
      {label:'Moderation',route:'/dashboard/moderation',permission:'MODERATION_MANAGE',scope:'PLATFORM',icon:'shield-check'},
      {label:'Platform analytics',route:'/dashboard/platform-analytics',permission:'ANALYTICS_VIEW',scope:'PLATFORM',icon:'chart-column'},
      {label:'System health',route:'/dashboard/system-health',permission:'SYSTEM_HEALTH_VIEW',scope:'PLATFORM',icon:'activity'},
      // My Account navigation is part of every authenticated consumer account.
      // Keep these personal destinations visible even when a deployment has not
      // seeded optional GLOBAL role-permission rows; APIs still enforce ownership.
      {label:'My Orders',route:'/dashboard/orders',permission:null,scope:'GLOBAL',icon:'receipt-text'},
      {label:'My Enquiries',route:'/dashboard/enquiries',permission:null,scope:'GLOBAL',icon:'messages-square'},
      {label:'My Payments',route:'/dashboard/payments',permission:null,scope:'GLOBAL',icon:'hand-coins'},
      {label:'My Profile & Addresses',route:'/dashboard/customers',permission:null,scope:'GLOBAL',icon:'contact-round'},
    ];
    return items.filter((item) => scope.includes(item.scope) && available(item.permission,item.scope));
  });

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const filters = {search:params.get('search') ?? '',status:params.get('status') ?? '',from:params.get('from') ?? '',to:params.get('to') ?? ''};
      this.activeFilters.set(filters); this.draftFilters.set(filters);
    });
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd),takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => { this.currentPath.set(event.urlAfterRedirects.split(/[?#]/,1)[0]); this.setFilterDrawerOpen(false); this.mobileExpanded.set(false); });
    try { await this.workspace.initialize(); } catch { /* Workspace service exposes its own error. */ }
  }

  hasPlatformAccess(): boolean {
    return this.workspace.platformPermissions().some((permission) => permission.scope_type === 'PLATFORM');
  }

  async switchContext(event: Event): Promise<void> {
    await this.switchContextSelection((event.target as HTMLSelectElement).value);
  }

  async switchContextSelection(selection: string): Promise<void> {
    if (this.contextSwitching() || !selection || selection === this.activeContextSelection()) return;
    this.contextSwitching.set(true);
    this.contextSwitchError.set('');
    try {
      if (selection === 'PERSONAL') await this.workspace.switchToMyAccount();
      else if (selection === 'PLATFORM') await this.workspace.switchToPlatformAdministration();
      else if (selection.startsWith('BUSINESS:')) {
        const tenantId = Number(selection.slice('BUSINESS:'.length));
        if (!Number.isInteger(tenantId) || !this.workspace.tenants().some((tenant) => tenant.id === tenantId)) {
          throw new Error('That Business Workspace is not available to your account.');
        }
        await this.workspace.switchWorkspace(tenantId);
      } else {
        throw new Error('Please choose a valid account area.');
      }
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.contextSwitchError.set(error instanceof Error ? error.message : 'Unable to switch account area.');
    } finally {
      this.contextSwitching.set(false);
    }
  }


  setFilterDrawerOpen(open: boolean): void {
    this.draftFilters.set({ ...this.activeFilters() });
    this.filterDrawerOpen.set(open);
  }
  resetDraftFilters(): void {
    this.draftFilters.set({ search: '', status: '', from: '', to: '' });
  }
  setDraftFilter(key: 'search' | 'status' | 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.draftFilters.update((filters) => ({...filters,[key]:value}));
  }
  applyFilters(): void {
    this.activeFilters.set({...this.draftFilters()});
    void this.router.navigate([this.currentPath()], {queryParams:Object.fromEntries(Object.entries(this.draftFilters()).filter(([,v])=>!!v)),queryParamsHandling:'merge'});
    this.setFilterDrawerOpen(false);
  }
  clearFilters(): void {
    this.draftFilters.set({search:'',status:'',from:'',to:''});
    this.activeFilters.set({search:'',status:'',from:'',to:''});
    void this.router.navigate([this.currentPath()], {queryParams:{search:null,status:null,from:null,to:null},queryParamsHandling:'merge'});
  }

}
