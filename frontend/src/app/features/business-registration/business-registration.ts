import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApplicationSubscription, BusinessApplication, BusinessApplicationPayload, BusinessRegistrationApiService, SubscriptionPlan } from '../../core/business/business-registration-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-business-registration',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './business-registration.html',
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .registration-page{padding:48px 20px 76px}.registration-card{width:min(820px,100%);margin:0 auto;padding:clamp(22px,4vw,42px);background:var(--surface-card);border:1px solid var(--border);border-radius:20px;box-shadow:0 16px 48px rgba(18,45,30,.06)}
    .back-link{display:inline-block;margin-bottom:34px;color:var(--text-secondary);font-size:.82rem;text-decoration:none}.eyebrow{margin:0 0 9px;color:var(--brand);font-size:.68rem;font-weight:800;letter-spacing:.14em}
    h1{margin:0;font-size:clamp(2rem,5vw,2.8rem);letter-spacing:-.055em}.intro{max-width:660px;margin:12px 0 28px;color:var(--text-secondary);font-size:.92rem;line-height:1.65}
    .field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.field{display:grid;gap:7px;min-width:0}.field.full{grid-column:1/-1}.field>span{font-size:.78rem;font-weight:750}
    input,textarea{width:100%;min-width:0;padding:12px 13px;color:var(--text-primary);background:var(--surface-page);border:1px solid var(--border);border-radius:9px;font:inherit;font-size:.85rem;outline:none}
    input:focus,textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}textarea{resize:vertical}
    .field small{color:var(--text-secondary);font-size:.7rem}.slug-control{display:flex;align-items:center;overflow:hidden;background:var(--surface-page);border:1px solid var(--border);border-radius:9px}.slug-control:focus-within{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}.slug-control>span{padding-left:12px;color:var(--text-secondary);font-size:.76rem;white-space:nowrap}.slug-control input{border:0;background:transparent;box-shadow:none!important}
    .form-note{display:grid;gap:5px;margin-top:24px;padding:15px 17px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px}.form-note strong{font-size:.8rem}.form-note span{color:var(--text-secondary);font-size:.76rem;line-height:1.55}
    .location-button{justify-self:start;padding:9px 12px;color:var(--brand);background:var(--surface-subtle);border:1px solid var(--border);border-radius:8px;font:inherit;font-size:.76rem;font-weight:750;cursor:pointer}.location-button:disabled{opacity:.6;cursor:wait}.location-note{grid-column:1/-1;margin:-8px 0 0;color:var(--text-secondary);font-size:.72rem;line-height:1.5}.map-attribution{grid-column:1/-1;color:var(--text-secondary);font-size:.68rem}.map-attribution a{color:inherit}
    .submit-button{display:flex;justify-content:center;align-items:center;gap:15px;width:100%;margin-top:20px;padding:14px 18px;color:#fff;background:var(--brand);border:0;border-radius:10px;font:inherit;font-size:.86rem;font-weight:800;cursor:pointer}.submit-button:disabled{opacity:.6;cursor:wait}
    .notice.success{color:#176b43;background:#e8f5ed;border:1px solid #c8e6d2}.wizard-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:12px}.secondary-button{padding:13px 16px;color:var(--text-primary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px;font:inherit;font-size:.82rem;font-weight:750;cursor:pointer}.secondary-button:disabled{opacity:.6;cursor:wait}
    .plan-list{display:grid;gap:14px}.plan-card{display:grid;grid-template-columns:1fr auto;gap:12px;padding:20px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:12px}.plan-code{margin:0 0 6px;color:var(--brand);font-size:.65rem;font-weight:850;letter-spacing:.1em}.plan-card h2{margin:0 0 6px;font-size:1.05rem}.plan-card p:not(.plan-code){margin:0;color:var(--text-secondary);font-size:.78rem;line-height:1.5}.plan-price{display:grid;align-content:start;justify-items:end;gap:5px}.plan-price strong{font-size:1.15rem}.plan-price span{color:var(--text-secondary);font-size:.7rem}.plan-card .submit-button{grid-column:1/-1;margin-top:5px}.back-step{margin-top:18px}
    .payment-card{display:grid;gap:15px}.payment-summary{display:grid;grid-template-columns:1fr auto;gap:8px;padding:16px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:11px}.payment-summary span{color:var(--text-secondary);font-size:.75rem}.payment-summary strong{text-align:right;font-size:.82rem}.qr-panel{display:grid;justify-items:center;gap:10px;padding:20px;background:#fff;border:1px solid var(--border);border-radius:12px}.qr-panel img{width:min(250px,100%);height:auto;object-fit:contain}.qr-panel span{color:#4b5563;font-size:.75rem}.payment-line,.payment-instructions{margin:0;padding:10px 12px;background:var(--surface-subtle);border-radius:8px;font-size:.78rem;line-height:1.55}.proof-field{margin-top:4px}.completion-card{display:grid;justify-items:center;text-align:center;padding:26px 10px}.completion-icon{display:grid;width:58px;height:58px;place-items:center;color:#176b43;background:#e8f5ed;border-radius:50%;font-size:1.8rem;font-weight:850}.completion-card h2{margin:18px 0 6px;font-size:1.2rem}.completion-card p{max-width:500px;color:var(--text-secondary);font-size:.84rem;line-height:1.6}.completion-card .submit-button{max-width:340px}

    .notice{margin:0 0 18px;padding:12px 14px;border-radius:9px;font-size:.8rem}.error{color:#a3322b;background:#fff2f0;border:1px solid #f0c8c2}
    @media(max-width:620px){.registration-page{padding:24px 12px 48px}.registration-card{padding:22px 17px;border-radius:14px}.field-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.back-link{margin-bottom:26px}.wizard-actions{grid-template-columns:1fr}.plan-card{grid-template-columns:1fr}.plan-price{justify-items:start}.plan-card .submit-button{grid-column:auto}}
  `],
})
export class BusinessRegistration implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BusinessRegistrationApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly step = signal<'details' | 'plans' | 'payment' | 'complete'>('details');
  readonly application = signal<{ business_id: number; tenant_id: number; approval_status: string } | null>(null);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly selectedPlan = signal<SubscriptionPlan | null>(null);
  readonly subscription = signal<ApplicationSubscription | null>(null);
  readonly paymentReference = signal('');
  readonly proofFile = signal<File | null>(null);
  readonly geolocating = signal(false);
  readonly locationNotice = signal('');
  readonly coordinates = signal<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  readonly form = this.fb.nonNullable.group({
    business_name: ['', [Validators.required, Validators.maxLength(180)]],
    business_slug: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    business_email: ['', [Validators.email, Validators.maxLength(190)]],
    business_phone: ['', [Validators.maxLength(25)]],
    whatsapp_number: ['', [Validators.maxLength(25)]],
    business_description: ['', [Validators.maxLength(5000)]],
    address_line_1: ['', [Validators.maxLength(190)]],
    address_line_2: ['', [Validators.maxLength(190)]],
    city: ['', [Validators.maxLength(100)]],
    state: ['', [Validators.maxLength(100)]],
    postal_code: ['', [Validators.maxLength(15)]],
  });

  async ngOnInit(): Promise<void> {
    try {
      if (!await this.auth.restoreSession()) {
        await this.router.navigate(['/']);
        return;
      }
      if (!this.auth.user()) await this.auth.loadProfile();
      const businessId = Number(this.route.snapshot.queryParamMap.get('business_id'));
      const tenantId = Number(this.route.snapshot.queryParamMap.get('tenant_id'));
      if (Number.isInteger(businessId) && businessId > 0 && Number.isInteger(tenantId) && tenantId > 0) {
        const owned = await this.api.getMyApplications();
        const existing = owned.find((item) => item.business_id === businessId && item.tenant_id === tenantId);
        if (!existing) throw new Error('This business draft was not found or you are not its owner.');
        if (!['DRAFT', 'PENDING'].includes(existing.approval_status)) {
          await this.router.navigate(['/workspace']);
          return;
        }
        this.application.set({ business_id: businessId, tenant_id: tenantId, approval_status: existing.approval_status });
        this.form.patchValue({
          business_name: existing.business_name, business_slug: existing.business_slug,
          business_email: existing.business_email, business_phone: existing.business_phone,
          whatsapp_number: existing.whatsapp_number, business_description: existing.business_description ?? '',
          address_line_1: existing.address_line_1, address_line_2: existing.address_line_2,
          city: existing.city, state: existing.state, postal_code: existing.postal_code,
        });
        this.coordinates.set({ latitude: existing.latitude, longitude: existing.longitude });
        const pendingPayment = await this.api.getCurrentApplicationSubscription(businessId, tenantId);
        if (pendingPayment) {
          this.subscription.set(pendingPayment);
          this.step.set('payment');
        } else if (existing.approval_status !== 'DRAFT') {
          await this.router.navigate(['/workspace']);
          return;
        }
      }
      // Keep registration available even when the user already owns other businesses.
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  updateSlug(): void {
    const name = this.form.controls.business_name.value;
    if (!this.form.controls.business_slug.dirty) {
      this.form.controls.business_slug.setValue(name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }

  async getMyLocation(): Promise<void> {
    if (!('geolocation' in navigator)) {
      this.locationNotice.set('Location is not supported by this browser. You can enter the address manually.');
      return;
    }
    this.geolocating.set(true);
    this.locationNotice.set('Requesting your location…');
    navigator.geolocation.getCurrentPosition(
      async position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        this.coordinates.set({ latitude, longitude });
        const accuracy = Math.round(position.coords.accuracy);
        this.locationNotice.set('Coordinates captured (approximately ' + accuracy + ' m accuracy). Looking up the address…');
        try {
          const query = new URLSearchParams({
            format: 'jsonv2',
            lat: String(latitude),
            lon: String(longitude),
            addressdetails: '1',
            'accept-language': 'en',
          });
          const response = await fetch('https://nominatim.openstreetmap.org/reverse?' + query.toString(), {
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) throw new Error('Address lookup is temporarily unavailable.');
          const result = await response.json() as {
            display_name?: string;
            address?: Record<string, string>;
          };
          const address = result.address ?? {};
          const road = [address.house_number, address.road].filter(Boolean).join(' ');
          const locality = address.suburb || address.neighbourhood || address.quarter || '';
          const city = address.city || address.town || address.village || address.municipality || address.county || '';
          if (road) this.form.controls.address_line_1.setValue(road);
          if (locality) this.form.controls.address_line_2.setValue(locality);
          if (city) this.form.controls.city.setValue(city);
          if (address.state) this.form.controls.state.setValue(address.state);
          if (address.postcode) this.form.controls.postal_code.setValue(address.postcode);
          this.locationNotice.set(result.display_name
            ? 'Address detected. Please review and edit it to match your business premises.'
            : 'Coordinates captured. No readable address was returned; please enter it manually.');
        } catch {
          this.locationNotice.set('Coordinates were captured, but address lookup failed. Please enter or edit the address manually.');
        } finally {
          this.geolocating.set(false);
        }
      },
      error => {
        const message = error.code === GeolocationPositionError.PERMISSION_DENIED
          ? 'Location permission was denied. You can still enter the business address manually.'
          : error.code === GeolocationPositionError.TIMEOUT
            ? 'Location request timed out. Please try again or enter the address manually.'
            : 'Unable to retrieve your location. You can enter the address manually.';
        this.locationNotice.set(message);
        this.geolocating.set(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  private payload(): BusinessApplicationPayload {
    return {
      ...this.form.getRawValue(),
      tenant_type: 'BUSINESS',
      country_code: 'IN',
      latitude: this.coordinates().latitude,
      longitude: this.coordinates().longitude,
    };
  }

  async saveDraft(): Promise<boolean> {
    if (this.busy()) return false;
    this.form.controls.business_name.markAsTouched();
    this.form.controls.business_slug.markAsTouched();
    if (!this.form.controls.business_name.valid || !this.form.controls.business_slug.valid
      || this.form.controls.business_email.invalid) {
      this.error.set('Enter a business name and a valid storefront URL. Check the business email if provided.');
      return false;
    }
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      if (!this.auth.isAuthenticated()) throw new Error('Your session has expired. Please sign in again.');
      const current = this.application();
      const saved = await this.api.saveDraft(
        this.payload(),
        current?.business_id,
        current?.tenant_id,
      );
      this.application.set(saved);
      this.notice.set('Your business details have been saved. You can continue now or return to this draft later.');
      return true;
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  async continueToPlans(): Promise<void> {
    this.form.markAllAsTouched();
    const values = this.form.getRawValue();
    const requiredFields = [
      values.business_email, values.business_phone, values.address_line_1,
      values.city, values.state, values.postal_code,
    ];
    if (!this.form.valid || requiredFields.some((value) => !value.trim())) {
      this.error.set('Complete the business email, phone and full address before choosing a plan.');
      return;
    }
    if (!await this.saveDraft()) return;
    this.busy.set(true);
    try {
      const plans = await this.api.getActivePlans();
      if (!plans.length) throw new Error('No subscription plans are currently available. Please contact BBG support.');
      this.plans.set(plans);
      this.step.set('plans');
      this.notice.set('');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async choosePlan(plan: SubscriptionPlan): Promise<void> {
    const application = this.application();
    if (!application || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const subscription = await this.api.requestApplicationSubscription(
        application.business_id, application.tenant_id, plan.id,
      );
      this.selectedPlan.set(plan);
      this.subscription.set(subscription);
      this.step.set('payment');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  onProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.proofFile.set(file);
  }

  async submitPaymentProof(): Promise<void> {
    const application = this.application();
    const subscription = this.subscription();
    const file = this.proofFile();
    if (!application || !subscription || !file || this.busy()) {
      this.error.set('Choose your payment receipt before submitting.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.uploadApplicationPaymentProof(
        application.business_id, application.tenant_id, subscription.id,
        file, this.paymentReference(),
      );
      this.step.set('complete');
      this.notice.set('Your payment receipt has been submitted. Your business and payment are now awaiting BBG review.');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  openWorkspace(): void {
    void this.router.navigate(['/workspace']);
  }

  async submit(): Promise<void> {
    await this.continueToPlans();
  }

  goHome(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/']);
  }
}
