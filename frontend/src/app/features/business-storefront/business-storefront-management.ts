import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BusinessRegistrationApiService, OwnedStorefront, StorefrontUpdatePayload } from '../../core/business/business-registration-api.service';

@Component({
  selector: 'app-business-storefront-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="storefront-page">
      <section class="storefront-card">
        <a class="back-link" routerLink="/workspace">← Back to your businesses</a>
        <p class="eyebrow">BUSINESS WORKSPACE</p>
        <h1>Storefront configuration</h1>
        <p class="intro">Configure how your business appears in the BBG marketplace and publish your public storefront.</p>
        @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
        @if (notice()) { <div class="notice success" role="status">{{ notice() }}</div> }
        @if (loading()) {
          <p class="state-message">Loading storefront settings…</p>
        } @else if (storefront()) {
          <div class="store-status">
            <div><span>Business</span><strong>{{ storefront()?.business?.business_name }}</strong></div>
            <div><span>Publication</span><strong>{{ storefront()?.storefront?.publication_status }}</strong></div>
            <div><span>Storefront</span><strong>{{ storefront()?.storefront?.storefront_status }}</strong></div>
          </div>
          @if (publicUrl()) {
            <a class="public-link" [href]="publicUrl()" target="_blank" rel="noopener noreferrer">Open public storefront ↗</a>
          }
          <section class="settings-section">
            <h2>Storefront details</h2>
            <label class="field"><span>Storefront title</span><input [value]="title()" (input)="title.set($any($event.target).value)" maxlength="180" /></label>
            <label class="field"><span>Description</span><textarea [value]="description()" (input)="description.set($any($event.target).value)" rows="4" maxlength="500" placeholder="Describe what customers can find in your storefront."></textarea></label>
            <label class="field"><span>Theme code</span><input [value]="themeCode()" (input)="themeCode.set($any($event.target).value)" maxlength="50" placeholder="default" /></label>
            <label class="field"><span>WhatsApp number</span><input [value]="whatsappNumber()" (input)="whatsappNumber.set($any($event.target).value)" maxlength="25" placeholder="+919876543210" /></label>
            <div class="toggles">
              <label><input type="checkbox" [checked]="showPrices()" (change)="showPrices.set($any($event.target).checked)" /><span>Show product prices</span></label>
              <label><input type="checkbox" [checked]="acceptOrders()" (change)="acceptOrders.set($any($event.target).checked)" /><span>Accept online orders</span></label>
              <label><input type="checkbox" [checked]="whatsappEnabled()" (change)="whatsappEnabled.set($any($event.target).checked)" /><span>Enable WhatsApp contact</span></label>
            </div>
            <button class="primary-button" type="button" (click)="save()" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save storefront settings' }}</button>
          </section>
          <section class="publish-section">
            <div><h2>Publication</h2><p>Publish to make your storefront available at its public BBG URL. An approved business and active storefront entitlement are required.</p></div>
            @if (storefront()?.storefront?.storefront_status === 'ACTIVE' && storefront()?.storefront?.publication_status === 'PUBLISHED') {
              <button class="secondary-button" type="button" (click)="unpublish()" [disabled]="busy()">Unpublish storefront</button>
            } @else {
              <button class="primary-button" type="button" (click)="publish()" [disabled]="busy()">Publish storefront</button>
            }
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .storefront-page{display:grid;place-items:start center;padding:clamp(20px,4vw,48px) 16px}
    .storefront-card{width:min(900px,100%);padding:clamp(20px,4vw,38px);background:var(--surface-card);border:1px solid var(--border);border-radius:18px}
    .back-link{display:inline-block;margin-bottom:26px;color:var(--text-secondary);font-size:.78rem;text-decoration:none}.eyebrow{margin:0 0 9px;color:var(--brand);font-size:.67rem;font-weight:850;letter-spacing:.13em}
    h1{margin:0;font-size:clamp(1.8rem,4vw,2.35rem);letter-spacing:-.04em}.intro{margin:9px 0 24px;color:var(--text-secondary);font-size:.86rem;line-height:1.55}
    .notice{margin:0 0 16px;padding:11px 13px;border-radius:9px;font-size:.78rem}.notice.error{color:#a32929;background:#fceeee}.notice.success{color:#176b43;background:#e8f5ed}
    .store-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:20px 0}.store-status>div{display:grid;gap:5px;padding:13px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px}.store-status span{color:var(--text-secondary);font-size:.68rem}.store-status strong{font-size:.8rem}
    .public-link{display:inline-flex;margin-bottom:18px;color:var(--brand);font-size:.8rem;font-weight:750;text-decoration:none}
    .settings-section,.publish-section{display:grid;gap:14px;padding:20px 0;border-top:1px solid var(--border)}h2{margin:0;font-size:1.02rem}.field{display:grid;gap:7px}.field span{font-size:.75rem;font-weight:750}.field input,.field textarea{width:100%;padding:11px 12px;color:var(--text-primary);background:var(--surface-page);border:1px solid var(--border);border-radius:8px;font:inherit;font-size:.82rem;resize:vertical}
    .toggles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.toggles label{display:flex;align-items:center;gap:8px;padding:12px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:9px;font-size:.75rem}.toggles input{accent-color:var(--brand)}
    .publish-section{grid-template-columns:1fr auto;align-items:center}.publish-section p{margin:5px 0 0;color:var(--text-secondary);font-size:.75rem;line-height:1.5}
    .primary-button,.secondary-button{padding:11px 14px;border:0;border-radius:9px;font:inherit;font-size:.77rem;font-weight:800;cursor:pointer}.primary-button{color:#fff;background:var(--brand)}.secondary-button{color:var(--text-primary);background:var(--surface-subtle);border:1px solid var(--border)}button:disabled{opacity:.55;cursor:wait}.state-message{color:var(--text-secondary);font-size:.8rem}
    @media(max-width:650px){.store-status,.toggles{grid-template-columns:1fr}.publish-section{grid-template-columns:1fr}.publish-section button{width:100%}}
  `],
})
export class BusinessStorefrontManagement implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(BusinessRegistrationApiService);

  readonly tenantId = Number(this.route.snapshot.queryParamMap.get('tenant_id') ?? 0);
  readonly storefront = signal<OwnedStorefront | null>(null);
  readonly title = signal('');
  readonly description = signal('');
  readonly themeCode = signal('');
  readonly whatsappNumber = signal('');
  readonly showPrices = signal(true);
  readonly acceptOrders = signal(false);
  readonly whatsappEnabled = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  async ngOnInit(): Promise<void> {
    if (!Number.isInteger(this.tenantId) || this.tenantId < 1) {
      this.error.set('A valid business workspace is required.');
      return;
    }
    try {
      if (!await this.auth.restoreSession()) {
        await this.router.navigate(['/login'], {
          queryParams: { returnUrl: '/business/storefront?tenant_id=' + this.tenantId },
        });
        return;
      }
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  publicUrl(): string {
    const slug = this.storefront()?.business?.business_slug ?? '';
    return slug ? window.location.origin + '/store/' + slug : '';
  }

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.getOwnedStorefront(this.tenantId);
      this.storefront.set(result);
      const settings = result.storefront;
      this.title.set(settings.storefront_title ?? '');
      this.description.set(settings.storefront_description ?? '');
      this.themeCode.set(settings.theme_code ?? '');
      this.whatsappNumber.set(settings.whatsapp_number ?? '');
      this.showPrices.set(Boolean(Number(settings.show_prices)));
      this.acceptOrders.set(Boolean(Number(settings.accept_online_orders)));
      this.whatsappEnabled.set(Boolean(Number(settings.whatsapp_enabled)));
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.busy()) return;
    const payload: StorefrontUpdatePayload = {
      storefront_title: this.title(),
      storefront_description: this.description(),
      theme_code: this.themeCode(),
      show_prices: this.showPrices(),
      accept_online_orders: this.acceptOrders(),
      whatsapp_enabled: this.whatsappEnabled(),
      whatsapp_number: this.whatsappNumber(),
    };
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.updateOwnedStorefront(this.tenantId, payload);
      this.notice.set('Storefront settings saved.');
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async publish(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.publishOwnedStorefront(this.tenantId);
      this.notice.set('Your storefront is now published.');
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async unpublish(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.unpublishOwnedStorefront(this.tenantId);
      this.notice.set('Your storefront has been unpublished.');
      await this.load();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
