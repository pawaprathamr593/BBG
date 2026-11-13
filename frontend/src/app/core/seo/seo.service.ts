import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateRouteMetadata());
  }

  update(title: string, description: string, canonicalPath?: string, structuredData?: Record<string, unknown>): void {
    const safeTitle = title.trim() || 'BBG | Discover local businesses';
    const safeDescription = description.trim().slice(0, 300);
    this.title.setTitle(safeTitle);
    this.meta.updateTag({ name: 'description', content: safeDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'BBG' });
    this.meta.updateTag({ property: 'og:title', content: safeTitle });
    this.meta.updateTag({ property: 'og:description', content: safeDescription });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });

    const origin = this.document.location?.origin;
    const canonical = origin ? this.canonicalElement() : null;
    if (canonical) {
      const path = canonicalPath ?? (isPlatformBrowser(this.platformId) ? window.location.pathname : '/');
      canonical.href = new URL(path, origin).toString();
      this.meta.updateTag({ property: 'og:url', content: canonical.href });
    }

    const schema: Record<string, unknown> = structuredData ? { ...structuredData } : {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'BBG',
      description: safeDescription,
    };
    if (origin && typeof schema['url'] === 'string' && schema['url'].startsWith('/')) {
      schema['url'] = new URL(schema['url'], origin).toString();
    }
    this.setStructuredData(schema);
  }

  updateBusiness(data: { name: string; description?: string | null; url: string; city?: string | null; state?: string | null; countryCode?: string | null; phone?: string | null; email?: string | null }): void {
    const description = data.description?.trim() || `Discover ${data.name} on BBG and explore its products and services.`;
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: data.name,
      description,
      url: data.url,
    };
    if (data.city || data.state || data.countryCode) schema['address'] = {
      '@type': 'PostalAddress',
      ...(data.city ? { addressLocality: data.city } : {}),
      ...(data.state ? { addressRegion: data.state } : {}),
      ...(data.countryCode ? { addressCountry: data.countryCode } : {}),
    };
    if (data.phone) schema['telephone'] = data.phone;
    if (data.email) schema['email'] = data.email;
    this.update(`${data.name} | BBG Business Storefront`, description, data.url, schema);
  }

  private updateRouteMetadata(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const title = route.title ?? 'BBG | Discover local businesses';
    const description = (route.data['description'] as string | undefined)
      ?? 'Discover local businesses, explore products and connect with the people behind them on BBG.';
    const path = this.router.url.split(/[?#]/, 1)[0];
    const privateRoute = /^\/(consumer|entrepreneur|admin|login|register|access-denied)(?:\/|$)/.test(path);
    this.meta.updateTag({ name: 'robots', content: privateRoute ? 'noindex,nofollow' : 'index,follow,max-image-preview:large' });
    this.update(title, description);
    if (privateRoute) this.document.querySelector('link[rel="canonical"]')?.remove();
  }

  private canonicalElement(): HTMLLinkElement {
    let element = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!element) {
      element = this.document.createElement('link');
      element.rel = 'canonical';
      this.document.head.appendChild(element);
    }
    return element;
  }

  private setStructuredData(data: Record<string, unknown>): void {
    this.document.getElementById('bbg-structured-data')?.remove();
    const script = this.document.createElement('script');
    script.id = 'bbg-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
