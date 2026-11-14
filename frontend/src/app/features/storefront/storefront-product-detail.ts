import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MarketplaceApiService, MarketplaceProductDetail } from '../../core/marketplace/marketplace-api.service';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

@Component({
 selector:'app-storefront-product-detail',imports:[RouterLink],
 template:`
  @if(loading()){<p class="state" role="status">Loading product details…</p>}
  @else if(error()){<main class="state error" role="alert"><h1>Product unavailable</h1><p>{{error()}}</p><a [routerLink]="['/store',slug]">Return to storefront</a></main>}
  @else if(detail();as data){<main class="page"><a class="back" [routerLink]="['/store',slug,'products']">← Back to products</a>
   <article class="product"><div class="art">{{data.product.product_name.slice(0,1).toUpperCase()}}</div><div class="copy">
    @if(data.product.category_name){<p class="eyebrow">{{data.product.category_name}}</p>}<h1>{{data.product.product_name}}</h1>
    @if(data.product.brand_name){<p class="brand">{{data.product.brand_name}}</p>}
    <p class="description">{{data.product.description||'Contact the business for more information about this product.'}}</p>
    @if(context.detail()?.storefront?.show_prices&&data.product.selling_price!==undefined){<strong class="price">{{context.detail()?.storefront?.currency||''}} {{data.product.selling_price}}</strong>}@else{<span class="price">Contact the business for pricing</span>}
    <div class="facts"><span>Unit: {{data.product.unit.name}} ({{data.product.unit.symbol}})</span>@if(data.product.is_variant_product){<span>Available in variants</span>}</div>
    @if(data.variants.length){<section class="variants"><h2>Available variants</h2>@for(v of data.variants;track v.id){<div class="variant"><strong>{{v.variant_name}}</strong><span>{{v.variant_code}}</span>@if(context.detail()?.storefront?.show_prices&&v.selling_price!==undefined){<b>{{context.detail()?.storefront?.currency||''}} {{v.selling_price}}</b>}</div>}</section>}
    <a class="contact" [routerLink]="['/store',slug,'contact']">Contact business</a>
   </div></article></main>}`,
 styles:[`
 :host{display:block}.page{max-width:1120px;min-height:48vh;margin:auto;padding:42px 24px 70px}.back{display:inline-block;margin-bottom:20px;color:var(--text-secondary);font-size:.85rem;text-decoration:none}.product{display:grid;grid-template-columns:minmax(280px,.9fr) 1.1fr;gap:36px;padding:clamp(18px,4vw,36px);border:1px solid var(--border);border-radius:18px;background:var(--surface-card)}.art{display:grid;place-items:center;min-height:330px;border-radius:14px;background:linear-gradient(135deg,#e8f1eb,#f5eebd);color:#174d35;font-size:7rem;font-weight:850}.copy h1{margin:8px 0;font-size:clamp(2rem,5vw,3.2rem);letter-spacing:-.05em}.eyebrow{color:#63816f;font-size:.7rem;font-weight:800;letter-spacing:.14em}.brand,.description,.facts{color:var(--text-secondary)}.description{line-height:1.8}.price{display:block;margin:22px 0;color:var(--brand-strong);font-size:1.25rem}.facts{display:flex;gap:16px;flex-wrap:wrap;font-size:.82rem}.variants{margin-top:28px}.variant{display:flex;gap:12px;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);font-size:.82rem}.variant span{color:var(--text-secondary)}.contact{display:inline-flex;margin-top:25px;padding:12px 18px;border-radius:9px;background:#174d35;color:#fff;font-weight:750;text-decoration:none}.state{max-width:760px;margin:50px auto;padding:42px 24px;text-align:center;color:var(--text-secondary)}.state.error{color:var(--text-primary)}.state a{color:var(--brand-strong)}@media(max-width:760px){.product{grid-template-columns:1fr}.art{min-height:230px}.page{padding:28px 16px 50px}}
 `]
})
export class StorefrontProductDetail implements OnInit{
 readonly context=inject(StorefrontContextService);private readonly api=inject(MarketplaceApiService);private readonly route=inject(ActivatedRoute);private readonly seo=inject(StorefrontSeoService);
 readonly detail=signal<MarketplaceProductDetail|null>(null);readonly loading=signal(true);readonly error=signal('');readonly slug=this.route.parent?.snapshot.paramMap.get('businessSlug')||'';
 async ngOnInit():Promise<void>{
  const routeSlug=this.route.snapshot.paramMap.get('productSlug')||'';const publicId=routeSlug.slice(routeSlug.lastIndexOf('-')+1);
  if(!this.slug||!publicId||publicId===routeSlug){this.error.set('This product URL is not valid.');this.loading.set(false);return;}
  try{
   const response=await firstValueFrom(this.api.getStorefrontProduct(this.slug,publicId));
   if(response.status!=='SUCCESS'||!response.data||Array.isArray(response.data))throw new Error(response.msgArr?.[0]||'This published product could not be found.');
   const value=response.data as MarketplaceProductDetail;this.detail.set(value);
   const business=this.context.detail()?.business;const name=value.product.product_name;const businessName=business?.business_name||'Business';const description=value.product.description||`Explore ${name} from ${businessName} on BBG.`;
   const path=`/store/${encodeURIComponent(this.slug)}/products/${routeSlug}`;
   this.seo.update(`${name} | ${businessName} | BBG`,description,path,{'@context':'https://schema.org','@type':'Product',name,description,url:path,...(value.product.brand_name?{brand:{'@type':'Brand',name:value.product.brand_name}}:{}),...(this.context.detail()?.storefront.show_prices&&value.product.selling_price!==undefined&&this.context.detail()?.storefront.currency?{offers:{'@type':'Offer',price:String(value.product.selling_price),priceCurrency:this.context.detail()?.storefront.currency,availability:'https://schema.org/InStock'}}:{})});
  }catch(error){this.error.set(error instanceof Error?error.message:'Unable to load this product.');}finally{this.loading.set(false);}
 }
}
