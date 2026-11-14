import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class StorefrontSeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  update(
    title: string,
    description: string,
    path: string,
    schema?: Record<string, unknown>,
    robots = 'index,follow,max-image-preview:large',
  ): void {
    const cleanDescription = description.replace(/\s+/g, ' ').trim().slice(0, 200);
    const origin = this.document.location?.origin;
    const canonical = origin ? new URL(path, origin).toString() : path;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: cleanDescription });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'BBG' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: cleanDescription });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: cleanDescription });

    let canonicalLink = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = this.document.createElement('link');
      canonicalLink.rel = 'canonical';
      this.document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    this.document.getElementById('bbg-storefront-jsonld')?.remove();
    if (schema) {
      const script = this.document.createElement('script');
      script.id = 'bbg-storefront-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      this.document.head.appendChild(script);
    }
  }
}
