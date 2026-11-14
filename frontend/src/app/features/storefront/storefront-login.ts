import { Component, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthExperienceComponent } from '../../shared/auth-experience/auth-experience';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

@Component({
  selector: 'app-storefront-login',
  standalone: true,
  imports: [AuthExperienceComponent],
  template: `
    <main class="storefront-auth">
      <app-auth-experience [brandName]="brandName" [reason]="'Sign in to continue with ' + brandName + '.'" />
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100%; }
    .storefront-auth { display:grid; min-height:65vh; place-items:center; padding:clamp(28px,5vw,56px) 16px; background:var(--surface-page); color:var(--text-primary); }
  `],
})
export class StorefrontLogin {
  private readonly context = inject(StorefrontContextService);
  private readonly seo = inject(StorefrontSeoService);
  private readonly slug = inject(ActivatedRoute).parent?.snapshot.paramMap.get('businessSlug') || '';

  get brandName(): string {
    const detail = this.context.detail();
    return detail?.storefront.title || detail?.business.business_name || 'Business';
  }

  constructor() {
    effect(() => {
      const detail = this.context.detail();
      if (!detail) return;
      const name = detail.storefront.title || detail.business.business_name;
      const title = 'Sign in | ' + name;
      const description = 'Sign in to your customer account at ' + name + '.';
      this.seo.update(title, description, '/store/' + encodeURIComponent(this.slug) + '/login', undefined, 'noindex,follow');
    });
  }
}
