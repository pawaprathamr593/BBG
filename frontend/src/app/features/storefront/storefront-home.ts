import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MarketplaceApiService, MarketplaceProduct } from '../../core/marketplace/marketplace-api.service';
import { StorefrontContextService } from './storefront-context.service';

@Component({
  selector:'app-storefront-home',imports:[RouterLink],
  template:`
    @if(context.detail();as data){
      <section class="hero">
        @if(data.business.cover_image_path){<img class="cover" [src]="data.business.cover_image_path" [alt]="brandName + ' cover image'"/>}
        <div class="hero-copy"><p class="eyebrow">{{data.business.category_name||'BBG BUSINESS STOREFRONT'}}</p><h1>{{brandName}}</h1>
          <p>{{data.storefront.description||data.business.business_description||'Explore our products and connect with our team.'}}</p>
          <div class="actions"><a class="primary" [routerLink]="['/store',data.business.business_slug,'products']">Explore products</a><a class="secondary" [routerLink]="['/store',data.business.business_slug,'contact']">Contact business</a></div>
          <div class="meta">@if(data.business.city||data.business.state){<span>{{data.business.city}}{{data.business.city&&data.business.state?', ':''}}{{data.business.state}}</span>}@if(data.storefront.accept_online_orders){<span>Online orders available</span>}</div>
        </div>
      </section>
      <section class="featured"><div class="section-head"><div><p class="eyebrow">THE CATALOGUE</p><h2>Featured products</h2></div><a [routerLink]="['/store',data.business.business_slug,'products']">View all products →</a></div>
        @if(loading()){<p class="state" role="status">Loading products…</p>}
        @else if(products().length){<div class="grid">@for(product of products();track product.id){<a class="product" [routerLink]="['/store',data.business.business_slug,'products',productRoute(product)]"><span class="art">{{product.product_name.slice(0,1).toUpperCase()}}</span>@if(product.category_name){<small>{{product.category_name}}</small>}<strong>{{product.product_name}}</strong><span class="description">{{product.description||'View product details'}}</span>@if(data.storefront.show_prices&&product.selling_price!==undefined){<b>{{data.storefront.currency||''}} {{product.selling_price}}</b>}@else{<em>Contact for pricing</em>}</a>}</div>}
        @else{<div class="empty"><h3>Products coming soon</h3><p>This business has not published products yet.</p></div>}
      </section>
    }`,
  styles:[`
    :host{display:block}.hero{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;min-height:360px;padding:70px max(24px,calc((100vw - 1120px)/2));background:linear-gradient(120deg,#103c29,#246747);color:#fff}.cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.2;z-index:-1}.hero-copy{max-width:720px}.eyebrow{margin:0 0 12px;color:#b9d5c3;font-size:.7rem;font-weight:800;letter-spacing:.16em}.hero h1{margin:0 0 16px;font-size:clamp(2.2rem,6vw,4.3rem);line-height:1.02;letter-spacing:-.05em}.hero p:not(.eyebrow){max-width:620px;line-height:1.7;color:#e0eee5}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:26px 0}.actions a{padding:12px 17px;border-radius:9px;text-decoration:none;font-weight:750;font-size:.85rem}.primary{background:#f5d928;color:#183c2b}.secondary{border:1px solid #ffffff80;color:#fff}.meta{display:flex;gap:20px;flex-wrap:wrap;color:#c9dfd0;font-size:.78rem}
    .featured{max-width:1120px;margin:auto;padding:54px 24px 70px}.section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}.section-head .eyebrow{color:#63816f}.section-head h2{margin:0;font-size:clamp(1.6rem,4vw,2.2rem)}.section-head>a{color:var(--brand-strong);font-weight:700;text-decoration:none;font-size:.85rem}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.product{display:flex;flex-direction:column;gap:9px;padding:14px;border:1px solid var(--border);border-radius:15px;background:var(--surface-card);color:var(--text-primary);text-decoration:none}.art{display:grid;place-items:center;aspect-ratio:4/3;border-radius:10px;background:linear-gradient(135deg,#e8f1eb,#f5eebd);color:#174d35;font-size:2.5rem;font-weight:850}.product small{color:var(--text-muted)}.product strong{font-size:1rem}.description{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:var(--text-secondary);font-size:.82rem;line-height:1.5}.product b{margin-top:auto;color:var(--brand-strong)}.product em{color:var(--text-secondary);font-size:.8rem}.empty,.state{padding:38px 20px;text-align:center;color:var(--text-secondary);border:1px dashed var(--border);border-radius:14px}.empty h3{color:var(--text-primary)}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.grid{grid-template-columns:1fr}.section-head{align-items:start;flex-direction:column}.hero{min-height:330px;padding-top:48px;padding-bottom:48px}}
  `],
})
export class StorefrontHome implements OnInit {
  readonly context=inject(StorefrontContextService); private readonly api=inject(MarketplaceApiService);
  readonly products=signal<MarketplaceProduct[]>([]); readonly loading=signal(true);
  get brandName():string {const d=this.context.detail();return d?.storefront.title||d?.business.business_name||'Storefront';}
  async ngOnInit():Promise<void>{const slug=this.context.detail()?.business.business_slug;if(!slug){this.loading.set(false);return;}try{const r=await firstValueFrom(this.api.listStorefrontProducts(slug,1,8));if(r.status==='SUCCESS'&&!Array.isArray(r.data))this.products.set(r.data.items||[]);}catch{}finally{this.loading.set(false);}}
  productRoute(p:MarketplaceProduct):string{return `${p.slug||slugify(p.product_name)}-${p.public_id||p.id}`;}
}
function slugify(v:string):string{return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'product';}
