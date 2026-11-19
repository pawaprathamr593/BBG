import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BusinessApplication, BusinessRegistrationApiService } from '../../core/business/business-registration-api.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-business-workspace',
  standalone: true,
  templateUrl: './business-workspace.html',
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}.status-page{display:grid;min-height:65vh;place-items:start center;padding:54px 18px 76px}
    .status-card{width:min(760px,100%);padding:clamp(22px,4vw,42px);background:var(--surface-card);border:1px solid var(--border);border-radius:18px;box-shadow:0 16px 48px rgba(18,45,30,.055)}
    .eyebrow{margin:0 0 12px;color:var(--brand);font-size:.68rem;font-weight:800;letter-spacing:.14em}.status-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.status-heading h1{margin:0;font-size:clamp(1.8rem,4vw,2.5rem);letter-spacing:-.05em}.status-heading p{margin:7px 0 0;color:var(--text-secondary);font-size:.8rem}
    .status-pill{padding:7px 11px;border-radius:999px;background:var(--surface-subtle);border:1px solid var(--border);font-size:.7rem;font-weight:800;white-space:nowrap}.status-pill[data-status="PENDING"]{color:#8a6412;background:#fff8e4;border-color:#ead9a7}.status-pill[data-status="APPROVED"]{color:#176b43;background:#e8f5ed;border-color:#c8e6d2}.status-pill[data-status="REJECTED"]{color:#a3322b;background:#fff2f0;border-color:#f0c8c2}
    .status-symbol{display:grid;width:54px;height:54px;place-items:center;margin:30px 0 16px;color:#8a6412;background:#fff8e4;border-radius:15px;font-size:1.6rem;font-weight:850}.status-symbol[data-status="APPROVED"]{color:#176b43;background:#e8f5ed}.status-symbol[data-status="REJECTED"]{color:#a3322b;background:#fff2f0}
    h2{margin:0 0 8px;font-size:1.2rem}.status-card>p:not(.eyebrow){max-width:620px;color:var(--text-secondary);font-size:.88rem;line-height:1.65}
    .business-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:25px;padding:17px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:12px}.business-summary span{display:grid;gap:5px;min-width:0}.business-summary small{color:var(--text-secondary);font-size:.68rem}.business-summary strong{overflow-wrap:anywhere;font-size:.8rem}
    .reason{display:grid;gap:5px;margin-top:15px;padding:14px;background:var(--surface-subtle);border-radius:9px;font-size:.8rem}.reason span{color:var(--text-secondary);line-height:1.55}
    .workspace-actions{display:flex;flex-wrap:wrap;gap:10px}.workspace-actions .market-button{margin-top:24px}.secondary-market-button{color:var(--text-primary)!important;background:var(--surface-subtle)!important;border:1px solid var(--border)!important}
    .application-list{display:grid;gap:14px;margin-top:24px}.application-card{padding:18px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:12px}.application-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.application-heading h2{margin:0;font-size:1.05rem}.application-heading p{margin:5px 0 0;color:var(--text-secondary);font-size:.75rem}.application-note{margin:14px 0 0;color:var(--text-secondary);font-size:.8rem;line-height:1.55}.application-card .business-summary{margin-top:15px;background:var(--surface-card)}.status-pill[data-status="DRAFT"]{color:var(--text-secondary)}

    .market-button,.status-card button{margin-top:24px;padding:11px 16px;color:#fff;background:var(--brand);border:0;border-radius:9px;font:inherit;font-size:.8rem;font-weight:750;cursor:pointer}.loading{display:flex;align-items:center;gap:15px}.loading p{margin:4px 0 0;color:var(--text-secondary);font-size:.8rem}.spinner{width:25px;height:25px;border:3px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:600px){.status-page{padding:28px 12px 50px}.status-heading{flex-direction:column}.business-summary{grid-template-columns:1fr}}
  `],
})
export class BusinessWorkspace implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(BusinessRegistrationApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly applications = signal<BusinessApplication[]>([]);
  readonly rejectedPaymentBusinessIds = signal<number[]>([]);

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      if (!await this.auth.restoreSession()) {
        await this.router.navigate(['/']);
        return;
      }
      if (!this.auth.user()) await this.auth.loadProfile();
      const applications = await this.api.getMyApplications();
      if (!applications.length) {
        await this.router.navigate(['/business/register']);
        return;
      }
      this.applications.set(applications);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  locationLabel(business: BusinessApplication): string {
    return [business.city, business.state].filter((part): part is string => !!part).join(', ') || 'Not provided';
  }

  statusLabel(status: string): string {
    return status === 'APPROVED' ? 'Approved'
      : status === 'REJECTED' ? 'Needs attention'
        : status === 'DRAFT' ? 'Draft'
          : 'Pending review';
  }

  resumeDraft(business: BusinessApplication): void {
    if (business.approval_status !== 'DRAFT') return;
    void this.router.navigate(['/business/register'], {
      queryParams: { business_id: business.business_id, tenant_id: business.tenant_id },
    });
  }

  registerAnotherBusiness(): void {
    void this.router.navigate(['/business/register']);
  }

  resumePayment(business: BusinessApplication): void {
    if (!this.rejectedPaymentBusinessIds().includes(business.business_id)) return;
    void this.router.navigate(['/business/register'], {
      queryParams: { business_id: business.business_id, tenant_id: business.tenant_id },
    });
  }

  async openWorkspace(business: BusinessApplication): Promise<void> {
    if (business.approval_status !== 'APPROVED') return;
    try {
      await this.workspace.initialize();
      await this.workspace.switchWorkspace(business.tenant_id);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  visitMarketplace(): void { void this.router.navigate(['/']); }
}
