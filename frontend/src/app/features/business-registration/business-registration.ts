import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  ApplicationSubscription,
  BusinessApplication,
  BusinessApplicationPayload,
  BusinessRegistrationApiService,
  SubscriptionPlan,
} from '../../core/business/business-registration-api.service';
import { PlanCardComponent } from '../../shared/components/plan-card/plan-card.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-business-registration',
  standalone: true,
  imports: [ReactiveFormsModule, PlanCardComponent],
  templateUrl: './business-registration.html',
  styleUrl: './business-registration.scss',
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
  readonly application = signal<{
    business_id: number;
    tenant_id: number;
    approval_status: string;
  } | null>(null);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly selectedPlan = signal<SubscriptionPlan | null>(null);
  readonly subscription = signal<ApplicationSubscription | null>(null);
  readonly paymentReference = signal('');
  readonly proofFile = signal<File | null>(null);
  readonly geolocating = signal(false);
  readonly locationNotice = signal('');
  readonly coordinates = signal<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });
  readonly form = this.fb.nonNullable.group({
    business_name: ['', [Validators.required, Validators.maxLength(180)]],
    business_slug: [
      '',
      [
        Validators.required,
        Validators.maxLength(200),
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      ],
    ],
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
      if (!(await this.auth.restoreSession())) {
        await this.router.navigate(['/']);
        return;
      }
      if (!this.auth.user()) await this.auth.loadProfile();
      const businessId = Number(this.route.snapshot.queryParamMap.get('business_id'));
      const tenantId = Number(this.route.snapshot.queryParamMap.get('tenant_id'));
      if (
        Number.isInteger(businessId) &&
        businessId > 0 &&
        Number.isInteger(tenantId) &&
        tenantId > 0
      ) {
        const owned = await this.api.getMyApplications();
        const existing = owned.find(
          (item) => item.business_id === businessId && item.tenant_id === tenantId,
        );
        if (!existing)
          throw new Error('This business draft was not found or you are not its owner.');
        if (!['DRAFT', 'PENDING'].includes(existing.approval_status)) {
          await this.router.navigate(['/workspace']);
          return;
        }
        this.application.set({
          business_id: businessId,
          tenant_id: tenantId,
          approval_status: existing.approval_status,
        });
        this.form.patchValue({
          business_name: existing.business_name,
          business_slug: existing.business_slug,
          business_email: existing.business_email,
          business_phone: existing.business_phone,
          whatsapp_number: existing.whatsapp_number,
          business_description: existing.business_description ?? '',
          address_line_1: existing.address_line_1,
          address_line_2: existing.address_line_2,
          city: existing.city,
          state: existing.state,
          postal_code: existing.postal_code,
        });
        this.coordinates.set({ latitude: existing.latitude, longitude: existing.longitude });
        const pendingPayment = await this.api.getCurrentApplicationSubscription(
          businessId,
          tenantId,
        );
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
      this.form.controls.business_slug.setValue(
        name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  }

  async getMyLocation(): Promise<void> {
    if (!('geolocation' in navigator)) {
      this.locationNotice.set(
        'Location is not supported by this browser. You can enter the address manually.',
      );
      return;
    }
    this.geolocating.set(true);
    this.locationNotice.set('Requesting your location…');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        this.coordinates.set({ latitude, longitude });
        const accuracy = Math.round(position.coords.accuracy);
        this.locationNotice.set(
          'Coordinates captured (approximately ' +
            accuracy +
            ' m accuracy). Looking up the address…',
        );
        try {
          const query = new URLSearchParams({
            format: 'jsonv2',
            lat: String(latitude),
            lon: String(longitude),
            addressdetails: '1',
            'accept-language': 'en',
          });
          const response = await fetch(
            'https://nominatim.openstreetmap.org/reverse?' + query.toString(),
            {
              headers: { Accept: 'application/json' },
            },
          );
          if (!response.ok) throw new Error('Address lookup is temporarily unavailable.');
          const result = (await response.json()) as {
            display_name?: string;
            address?: Record<string, string>;
          };
          const address = result.address ?? {};
          const road = [address['house_number'], address['road']].filter(Boolean).join(' ');
          const locality =
            address['suburb'] || address['neighbourhood'] || address['quarter'] || '';
          const city =
            address['city'] ||
            address['town'] ||
            address['village'] ||
            address['municipality'] ||
            address['county'] ||
            '';
          if (road) this.form.controls.address_line_1.setValue(road);
          if (locality) this.form.controls.address_line_2.setValue(locality);
          if (city) this.form.controls.city.setValue(city);
          if (address['state']) this.form.controls.state.setValue(address['state']);
          if (address['postcode']) this.form.controls.postal_code.setValue(address['postcode']);
          this.locationNotice.set(
            result.display_name
              ? 'Address detected. Please review and edit it to match your business premises.'
              : 'Coordinates captured. No readable address was returned; please enter it manually.',
          );
        } catch {
          this.locationNotice.set(
            'Coordinates were captured, but address lookup failed. Please enter or edit the address manually.',
          );
        } finally {
          this.geolocating.set(false);
        }
      },
      (error) => {
        const message =
          error.code === GeolocationPositionError.PERMISSION_DENIED
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
    if (
      !this.form.controls.business_name.valid ||
      !this.form.controls.business_slug.valid ||
      this.form.controls.business_email.invalid
    ) {
      this.error.set(
        'Enter a business name and a valid storefront URL. Check the business email if provided.',
      );
      return false;
    }
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      if (!this.auth.isAuthenticated())
        throw new Error('Your session has expired. Please sign in again.');
      const current = this.application();
      const saved = await this.api.saveDraft(
        this.payload(),
        current?.business_id,
        current?.tenant_id,
      );
      this.application.set(saved);
      this.notice.set(
        'Your business details have been saved. You can continue now or return to this draft later.',
      );
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
      values.business_email,
      values.business_phone,
      values.address_line_1,
      values.city,
      values.state,
      values.postal_code,
    ];
    if (!this.form.valid || requiredFields.some((value) => !value.trim())) {
      this.error.set('Complete the business email, phone and full address before choosing a plan.');
      return;
    }
    if (!(await this.saveDraft())) return;
    this.busy.set(true);
    try {
      const plans = await this.api.getActivePlans();
      if (!plans.length)
        throw new Error(
          'No subscription plans are currently available. Please contact BBG support.',
        );
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
        application.business_id,
        application.tenant_id,
        plan.id,
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
        application.business_id,
        application.tenant_id,
        subscription.id,
        file,
        this.paymentReference(),
      );
      this.step.set('complete');
      this.notice.set(
        'Your payment receipt has been submitted. Your business and payment are now awaiting BBG review.',
      );
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
