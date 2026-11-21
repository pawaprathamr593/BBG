import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  BusinessRegistrationApiService,
  OwnedStorefront,
  StorefrontUpdatePayload,
} from '../../core/business/business-registration-api.service';

@Component({
  selector: 'app-business-storefront-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './business-storefront-management.html',
  styleUrl: './business-storefront-management.scss',
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
      if (!(await this.auth.restoreSession())) {
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
