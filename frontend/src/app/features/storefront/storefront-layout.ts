import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

@Component({
  selector: 'app-storefront-layout', imports: [RouterLink, RouterLinkActive, RouterOutlet],
  providers: [StorefrontContextService],
  template: `
    <div class="store-shell">
      @if (context.loading()) { <div class="state" role="status">Loading storefront…</div> }
      @else if (context.error()) { <main class="state error" role="alert"><h1>Storefront unavailable</h1><p>{{context.error()}}</p><a routerLink="/businesses">Browse businesses</a></main> }
      @else if (context.detail(); as data) {
        <header class="store-header">
          <a class="brand" [routerLink]="['/store',slug]">
            @if (data.business.logo_path) { <img [src]="data.business.logo_path" [alt]="brandName+' logo'"/> }
            @else { <span class="brand-mark">{{brandName.slice(0,1).toUpperCase()}}</span> }
            <span>{{brandName}}</span>
          </a>
          <nav aria-label="Storefront navigation">
            <a [routerLink]="['/store',slug]" [routerLinkActiveOptions]="{exact:true}" routerLinkActive="active">Home</a>
            <a [routerLink]="['/store',slug,'products']" routerLinkActive="active">Products</a>
            <a [routerLink]="['/store',slug,'about']" routerLinkActive="active">About</a>
            <a [routerLink]="['/store',slug,'contact']" routerLinkActive="active">Contact</a>
          </nav>
          <a class="account" routerLink="/login" [queryParams]="{returnUrl:currentUrl}">{{auth.isAuthenticated()?'My BBG account':'Sign in'}}</a>
        </header>
        <main id="storefront-content"><router-outlet/></main>
        <footer class="store-footer">
          <div><strong>{{brandName}}</strong><p>{{data.storefront.description || data.business.business_description || 'Discover products and connect with this business on BBG.'}}</p></div>
          <div class="footer-links"><a [routerLink]="['/store',slug,'about']">About</a><a [routerLink]="['/store',slug,'products']">Products</a><a [routerLink]="['/store',slug,'contact']">Contact</a></div>
          <small>Powered by BBG · © {{year}}</small>
        </footer>
      }
    </div>`,
  styles: [`
    :host{display:block}.store-shell{min-height:65vh;background:var(--surface-page);color:var(--text-primary)}
    .store-header{display:flex;align-items:center;gap:28px;max-width:1200px;margin:auto;padding:20px 24px;border-bottom:1px solid var(--border)}
    .brand{display:flex;align-items:center;gap:11px;min-width:190px;color:var(--text-primary);font-weight:800;text-decoration:none}
    .brand img,.brand-mark{width:42px;height:42px;border-radius:12px;object-fit:cover}.brand-mark{display:grid;place-items:center;background:#e8f1eb;color:#174d35;font-size:1.1rem}
    nav{display:flex;align-items:center;justify-content:center;gap:8px;flex:1}nav a,.account{padding:10px 12px;color:var(--text-secondary);font-size:.84rem;font-weight:650;text-decoration:none;border-radius:9px}nav a.active,nav a:hover{background:var(--brand-soft);color:var(--brand-strong)}.account{border:1px solid var(--border);color:var(--text-primary);white-space:nowrap}
    #storefront-content{min-height:42vh}.state{max-width:760px;margin:50px auto;padding:42px 24px;text-align:center;color:var(--text-secondary)}.state.error{color:var(--text-primary)}
    .store-footer{display:grid;grid-template-columns:1fr auto;gap:20px;max-width:1200px;margin:50px auto 0;padding:30px 24px;border-top:1px solid var(--border);color:var(--text-secondary)}.store-footer strong{color:var(--text-primary)}.store-footer p{max-width:540px;line-height:1.6}.footer-links{display:flex;gap:18px}.footer-links a{color:var(--text-secondary);text-decoration:none;font-size:.84rem}.store-footer small{grid-column:1/-1}
    @media(max-width:760px){.store-header{flex-wrap:wrap;gap:12px;padding:16px}.brand{flex:1}nav{order:3;flex-basis:100%;justify-content:flex-start;overflow:auto}nav a{white-space:nowrap}.store-footer{grid-template-columns:1fr}.footer-links{flex-wrap:wrap}}
  `],
})
export class StorefrontLayout implements OnInit {
  private readonly route=inject(ActivatedRoute); private readonly destroyRef=inject(DestroyRef); private readonly router=inject(Router); private readonly seo=inject(StorefrontSeoService);
  readonly context=inject(StorefrontContextService); readonly auth=inject(AuthService); slug=''; currentUrl=''; readonly year=new Date().getFullYear();
  get brandName():string { const d=this.context.detail(); return d?.storefront.title || d?.business.business_name || 'Business storefront'; }
  ngOnInit():void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params=>{
      const slug=params.get('businessSlug')||''; this.slug=slug; this.currentUrl=this.router.url;
      void this.context.load(slug).then(()=>{
        const d=this.context.detail(); if(!d)return;
        const name=d.storefront.title||d.business.business_name; const description=d.storefront.description||d.business.business_description||`Explore products from ${name} on BBG.`;
        this.seo.update(`${name} | BBG`,description,`/store/${encodeURIComponent(slug)}`,{'@context':'https://schema.org','@type':'LocalBusiness',name,description,url:`/store/${encodeURIComponent(slug)}`,...(d.business.business_phone?{telephone:d.business.business_phone}:{}),...(d.business.business_email?{email:d.business.business_email}:{})});
      });
    });
  }
}
