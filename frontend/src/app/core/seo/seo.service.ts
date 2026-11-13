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

    const canonical = this.canonicalElement();
    if (canonical) {
      const path = canonicalPath ?? (isPlatformBrowser(this.platformId) ? window.location.pathname : '/');
      canonical.href = new URL(path, this.document.location?.origin ?? 'https://example.invalid').toString();
    }
    this.setStructuredData(structuredData ?? {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'BBG',
      description: safeDescription,
    });
  }

  updateBusiness(data: { name: string; description?: string | null; url: string; city?: string | null; state?: string | null; phone?: string | null; email?: string | null }): void {
    const description = data.description?.trim() || `Discover ${data.name} on BBG and explore its products and services.`;
    const title = `${data.name} | BBG Business Storefront`;
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: data.name,
      description,
      url: data.url,
    };
    if (data.city || data.state) schema['address'] = {
      '@type': 'PostalAddress',
      ...(data.city ? { addressLocality: data.city } : {}),
      ...(data.state ? { addressRegion: data.state } : {}),
      addressCountry: 'IN',
    };
    if (data.phone) schema['telephone'] = data.phone;
    if (data.email) schema['email'] = data.email;
    this.update(title, description, data.url, schema);
  }

  private updateRouteMetadata(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const title = route.title ?? 'BBG | Discover local businesses';
    const description = (route.data['description'] as string | undefined)
      ?? 'Discover local businesses, explore products and connect with the people behind them on BBG.';
    this.update(title, description);
  }

  private canonicalElement(): HTMLLinkElement | null {
    let element = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!element) {
      element = this.document.createElement('link');
      element.rel = 'canonical';
      this.document.head.appendChild(element);
    }
    return element;
  }

  private setStructuredData(data: Record<string, unknown>): void {
    const existing = this.document.getElementById('bbg-structured-data');
    existing?.remove();
    const script = this.document.createElement('script');
    script.id = 'bbg-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
