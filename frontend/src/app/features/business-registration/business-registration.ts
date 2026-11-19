import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BusinessRegistrationApiService } from '../../core/business/business-registration-api.service';

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
    .submit-button{display:flex;justify-content:center;align-items:center;gap:15px;width:100%;margin-top:20px;padding:14px 18px;color:#fff;background:var(--brand);border:0;border-radius:10px;font:inherit;font-size:.86rem;font-weight:800;cursor:pointer}.submit-button:disabled{opacity:.6;cursor:wait}
    .notice{margin:0 0 18px;padding:12px 14px;border-radius:9px;font-size:.8rem}.error{color:#a3322b;background:#fff2f0;border:1px solid #f0c8c2}.success{color:#17643b;background:#edf9f1;border:1px solid #b8e3c7}
    .applications{display:grid;gap:10px;margin:0 0 26px}.application-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 15px;border:1px solid var(--border);border-radius:10px;background:var(--surface-subtle)}.application-item strong{display:block;font-size:.84rem}.application-item small{color:var(--text-secondary);font-size:.72rem}.status{font-size:.68rem;font-weight:800;letter-spacing:.04em}
    .location-tools{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:22px 0 14px}.location-tools button{padding:10px 13px;border:1px solid var(--border);border-radius:9px;background:var(--surface-subtle);color:var(--text-primary);font:inherit;font-size:.78rem;font-weight:750;cursor:pointer}.location-tools small{color:var(--text-secondary);font-size:.72rem}
    @media(max-width:620px){.registration-page{padding:24px 12px 48px}.registration-card{padding:22px 17px;border-radius:14px}.field-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.back-link{margin-bottom:26px}}
  `],
})
export class BusinessRegistration implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(BusinessRegistrationApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly applications = signal<BusinessApplication[]>([]);
  readonly submission = signal<{ business_id: number; tenant_id: number; approval_status: string } | null>(null);
  readonly locating = signal(false);
  readonly locationMessage = signal('');
  readonly locationAccuracy = signal<number | null>(null);
  readonly form = this.fb.nonNullable.group({
    business_name: ['', [Validators.required, Validators.maxLength(180)]],
    business_slug: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    business_email: ['', [Validators.required, Validators.email, Validators.maxLength(190)]],
    business_phone: ['', [Validators.required, Validators.maxLength(25)]],
    whatsapp_number: ['', [Validators.maxLength(25)]],
    business_description: ['', [Validators.maxLength(5000)]],
    address_line_1: ['', [Validators.required, Validators.maxLength(190)]],
    address_line_2: ['', [Validators.maxLength(190)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    state: ['', [Validators.required, Validators.maxLength(100)]],
    postal_code: ['', [Validators.required, Validators.maxLength(15)]],
    latitude: [''],
    longitude: [''],
  });

  async ngOnInit(): Promise<void> {
    try {
      if (!await this.auth.restoreSession()) {
        await this.router.navigate(['/']);
        return;
      }
      if (!this.auth.user()) await this.auth.loadProfile();
      this.applications.set(await this.api.getMyApplications());
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

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Please complete all required fields and check the storefront URL.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      if (!this.auth.isAuthenticated()) throw new Error('Your session has expired. Please sign in again.');
      const values = this.form.getRawValue();
      const application = await this.api.submitApplication({
        ...values,
        latitude: values.latitude === '' ? null : Number(values.latitude),
        longitude: values.longitude === '' ? null : Number(values.longitude),
        tenant_type: 'BUSINESS',
        country_code: 'IN',
      });
      this.submission.set(application);
      try {
        this.applications.set(await this.api.getMyApplications());
      } catch {
        this.locationMessage.set('Your application was saved. The business list could not refresh; reload this page to see its latest status.');
      }
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  getMyLocation(): void {
    this.locationMessage.set('');
    this.locationAccuracy.set(null);
    if (!navigator.geolocation) {
      this.locationMessage.set('Location is not supported by this browser. You can enter the address manually.');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.form.patchValue({
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
        });
        this.locationAccuracy.set(Math.round(position.coords.accuracy));
        this.locationMessage.set('Coordinates captured. Review and edit the business address fields below before submitting.');
        this.locating.set(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. You can still enter the business address manually.'
          : error.code === error.TIMEOUT
            ? 'Location request timed out. Try again or enter the address manually.'
            : 'Your location is unavailable. You can still enter the business address manually.';
        this.locationMessage.set(message);
        this.locating.set(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  goHome(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/']);
  }
}
