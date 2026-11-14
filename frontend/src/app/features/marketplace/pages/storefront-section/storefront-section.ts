import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthPromptService } from '../../../../core/auth/auth-prompt.service';
import { SeoService } from '../../../../core/seo/seo.service';
import { MarketplaceBusinessDetail, MarketplaceList, MarketplaceProduct, MarketplacePromotion } from '../../models/marketplace.models';
import { MarketplaceService } from '../../services/marketplace.service';
import { StorefrontEnquiryService } from '../../services/storefront-enquiry.service';

type StorefrontSectionKey = 'about' | 'products' | 'promotions' | 'contact';

@Component({
  selector: 'app-storefront-section',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './storefront-section.html',
  styleUrl: './storefront-section.scss',
})
export class StorefrontSection implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly marketplace = inject(MarketplaceService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly authPrompt = inject(AuthPromptService);
  private readonly enquiryService = inject(StorefrontEnquiryService);
  private readonly seo = inject(SeoService);
  protected readonly section = this.route.snapshot.data['storefrontSection'] as StorefrontSectionKey;
  protected readonly slug = this.route.parent?.snapshot.paramMap.get('businessSlug') ?? '';
  protected readonly detail = signal<MarketplaceBusinessDetail | null>(null);
  protected readonly products = signal<MarketplaceList<MarketplaceProduct> | null>(null);
  protected readonly promotions = signal<MarketplaceList<MarketplacePromotion> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly enquirySubmitting = signal(false);
  protected readonly enquiryError = signal('');
  protected readonly enquirySuccess = signal('');
  protected readonly enquiryForm = this.fb.nonNullable.group({
    subject: ['', [Validators.maxLength(180)]],
    message: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  protected readonly headings: Record<StorefrontSectionKey, { eyebrow: string; title: string; description: string }> = {
    about: { eyebrow: 'OUR STORY', title: 'About the business', description: 'Learn more about the people and business behind this storefront.' },
    products: { eyebrow: 'THE CATALOGUE', title: 'Products', description: 'Explore the products published by this business.' },
    promotions: { eyebrow: 'LATEST UPDATES', title: 'Offers and promotions', description: 'Explore offers and updates published by this business.' },
    contact: { eyebrow: 'GET IN TOUCH', title: 'Contact the business', description: 'Choose the contact method that works best for you.' },
  };

  ngOnInit(): void { void this.load(); }

  protected promptEnquirySignIn(event: MouseEvent, tenantId: number): void {
    const anchor = event.currentTarget;
    if (anchor instanceof HTMLElement) {
      this.authPrompt.open(
        'Sign in to send an enquiry and keep track of your conversation with this business.',
        anchor,
        () => this.submitEnquiry(tenantId),
      );
    }
  }

  protected async submitEnquiry(tenantId: number): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.enquiryForm.invalid || this.enquirySubmitting()) {
      this.enquiryForm.markAllAsTouched();
      return;
    }
    const { subject, message } = this.enquiryForm.getRawValue();
    this.enquirySubmitting.set(true);
    this.enquiryError.set('');
    this.enquirySuccess.set('');
    try {
      const result = await this.enquiryService.create(tenantId, subject, message);
      this.enquirySuccess.set(`Your enquiry ${result.enquiry_number} was sent successfully.`);
      this.enquiryForm.reset({ subject: '', message: '' });
    } catch (cause) {
      this.enquiryError.set(cause instanceof Error ? cause.message : 'Unable to send your enquiry. Please try again.');
    } finally {
      this.enquirySubmitting.set(false);
    }
  }

  private async load(): Promise<void> {
    if (!this.slug) {
      this.error.set('This storefront address is incomplete.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const detail = await this.marketplace.getBusiness(this.slug);
      this.detail.set(detail);
      const requests: Promise<unknown>[] = [];
      if (this.section === 'products') requests.push(this.marketplace.listProducts(this.slug, 1, 40).then(value => this.products.set(value)));
      if (this.section === 'promotions') requests.push(this.marketplace.listPromotions({ business_slug: this.slug, page: 1, page_size: 40 }).then(value => this.promotions.set(value)));
      await Promise.all(requests);
      const businessName = detail.storefront.title || detail.business.business_name;
      const heading = this.headings[this.section];
      this.seo.update(
        `${heading.title} | ${businessName} | BBG`,
        detail.storefront.description || detail.business.business_description || heading.description,
        `/businesses/${encodeURIComponent(this.slug)}/${this.section}`,
      );
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to load this storefront page.');
    } finally {
      this.loading.set(false);
    }
  }
}
