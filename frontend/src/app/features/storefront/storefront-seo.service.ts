import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class StorefrontSeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  update(title: string, description: string, path: string, schema?: Record<string, unknown>): void {
    const origin = this.document.location?.origin || 'https://bbg.example';
    const canonical = new URL(path, origin).toString();
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description.slice(0, 300) });
    this.meta.updateTag({ name: 'robots', content: 'index,follow,max-image-preview:large' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description.slice(0, 300) });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = this.document.createElement('link'); link.rel = 'canonical'; this.document.head.appendChild(link); }
    link.href = canonical;
    this.document.getElementById('bbg-storefront-jsonld')?.remove();
    if (schema) {
      const script = this.document.createElement('script');
      script.id = 'bbg-storefront-jsonld'; script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema); this.document.head.appendChild(script);
    }
  }
}
