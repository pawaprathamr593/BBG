import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MarketplaceApiService, MarketplaceProduct } from '../../core/marketplace/marketplace-api.service';
import { StorefrontContextService } from './storefront-context.service';
import { StorefrontSeoService } from './storefront-seo.service';

type Section='products'|'about'|'contact';
@Component({
 selector:'app-storefront-section',imports:[RouterLink],
 template:`
  @if(context.detail();as data){<main class="page">
   <header class="heading"><p class="eyebrow">{{section==='products'?'THE CATALOGUE':section==='about'?'OUR BUSINESS':'GET IN TOUCH'}}</p><h1>{{section==='products'?'Products':section==='about'?'About '+brandName:'Contact '+brandName}}</h1><p>{{section==='products'?'Explore products published by this business.':section==='about'?(data.storefront.description||data.business.business_description||'Learn more about this business.'):'Reach out to the business using the contact details below.'}}</p></header>
   @if(section==='products'){@if(loading()){<p class="state">Loading products…</p>}@else if(products().length){<div class="grid">@for(p of products();track p.id){<a class="product" [routerLink]="['/store',data.business.business_slug,'products',productRoute(p)]"><span class="art">{{p.product_name.slice(0,1).toUpperCase()}}</span>@if(p.category_name){<small>{{p.category_name}}</small>}<strong>{{p.product_name}}</strong><span class="description">{{p.description||'View product details'}}</span>@if(data.storefront.show_prices&&p.selling_price!==undefined){<b>{{data.storefront.currency||''}} {{p.selling_price}}</b>}@else{<em>Contact for pricing</em>}</a>}</div>}@else{<div class="state"><h2>No published products yet</h2><p>This business has not added products to its public catalogue.</p></div>}}
   @if(section==='about'){<article class="about">@if(data.business.cover_image_path){<img class="cover" [src]="data.business.cover_image_path" [alt]="brandName+' cover image'"/>}<div class="identity">@if(data.business.logo_path){<img [src]="data.business.logo_path" [alt]="brandName+' logo'"/>}<div><h2>{{brandName}}</h2><span>{{data.business.category_name||'BBG business'}}</span></div></div><p>{{data.storefront.description||data.business.business_description||'Business information has not been added yet.'}}</p>@if(data.business.city||data.business.state){<p class="location">{{data.business.city}}{{data.business.city&&data.business.state?', ':''}}{{data.business.state}}</p>}</article>}
   @if(section==='contact'){<div class="contact-grid">
    @if(data.business.business_phone){<a class="contact" [href]="'tel:'+data.business.business_phone"><span>PHONE</span><strong>{{data.business.business_phone}}</strong><small>Call the business</small></a>}
    @if(data.business.business_email){<a class="contact" [href]="'mailto:'+data.business.business_email"><span>EMAIL</span><strong>{{data.business.business_email}}</strong><small>Send an email</small></a>}
    @if(data.storefront.whatsapp_enabled&&data.business.whatsapp_number){<a class="contact" [href]="'https://wa.me/'+data.business.whatsapp_number.replace('+','')" target="_blank" rel="noopener noreferrer"><span>WHATSAPP</span><strong>Message the business</strong><small>Opens WhatsApp</small></a>}
    @if(data.business.address;as address){<article class="contact"><span>ADDRESS</span><strong>{{address.address_line_1}} {{address.address_line_2}}</strong><small>{{address.city}}{{address.city&&address.state?', ':''}}{{address.state}} {{address.postal_code}} {{address.country_code}}</small></article>}
    @if(!data.business.business_phone&&!data.business.business_email&&!(data.storefront.whatsapp_enabled&&data.business.whatsapp_number)){<div class="state"><h2>Contact details not published</h2><p>This business has not made direct contact details available.</p></div>}
   </div>}
  </main>}`,
 styles:[`
 :host{display:block}.page{max-width:1120px;min-height:45vh;margin:auto;padding:52px 24px 70px}.heading{max-width:760px;margin-bottom:30px}.eyebrow{margin:0 0 10px;color:#63816f;font-size:.7rem;font-weight:800;letter-spacing:.16em}.heading h1{margin:0 0 12px;font-size:clamp(2rem,5vw,3.1rem);letter-spacing:-.05em}.heading>p:last-child{color:var(--text-secondary);line-height:1.7}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.product{display:flex;flex-direction:column;gap:9px;padding:14px;border:1px solid var(--border);border-radius:15px;background:var(--surface-card);color:var(--text-primary);text-decoration:none}.art{display:grid;place-items:center;aspect-ratio:4/3;border-radius:10px;background:linear-gradient(135deg,#e8f1eb,#f5eebd);color:#174d35;font-size:2.4rem;font-weight:850}.product small,.contact span{color:var(--text-muted);font-size:.68rem;font-weight:800;letter-spacing:.1em}.description{color:var(--text-secondary);font-size:.82rem;line-height:1.5}.product b{color:var(--brand-strong)}.product em{color:var(--text-secondary);font-size:.8rem}.state{padding:40px;border:1px dashed var(--border);border-radius:14px;text-align:center;color:var(--text-secondary)}.about{overflow:hidden;border:1px solid var(--border);border-radius:18px;background:var(--surface-card)}.cover{display:block;width:100%;max-height:300px;object-fit:cover}.identity{display:flex;align-items:center;gap:14px;padding:24px 24px 0}.identity img{width:58px;height:58px;border-radius:14px;object-fit:cover}.identity h2{margin:0 0 4px}.identity span,.location{color:var(--text-secondary)}.about>p{padding:0 24px;line-height:1.8;color:var(--text-secondary)}.contact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.contact{display:flex;flex-direction:column;gap:9px;min-height:130px;padding:22px;border:1px solid var(--border);border-radius:14px;background:var(--surface-card);color:var(--text-primary);text-decoration:none}.contact strong{overflow-wrap:anywhere}.contact small{color:var(--text-secondary)}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.grid,.contact-grid{grid-template-columns:1fr}.page{padding:38px 18px 54px}}
 `]
})
export class StorefrontSection implements OnInit{
 readonly context=inject(StorefrontContextService);private readonly api=inject(MarketplaceApiService);private readonly route=inject(ActivatedRoute);private readonly seo=inject(StorefrontSeoService);
 readonly section=this.route.snapshot.data['section'] as Section;readonly products=signal<MarketplaceProduct[]>([]);readonly loading=signal(true);
 get brandName():string{const d=this.context.detail();return d?.storefront.title||d?.business.business_name||'Business';}
 async ngOnInit():Promise<void>{
  const detail=this.context.detail();const slug=detail?.business.business_slug;
  if(!detail||!slug){this.loading.set(false);return;}
  const name=detail.storefront.title||detail.business.business_name;
  const path=`/store/${encodeURIComponent(slug)}/${this.section}`;
  if(this.section==='products'){
   try{const r=await firstValueFrom(this.api.listStorefrontProducts(slug,1,48));if(r.status==='SUCCESS'&&!Array.isArray(r.data))this.products.set(r.data.items||[]);}catch{}finally{this.loading.set(false);}
   const description=`Browse products published by ${name}.`;
   const schema={'@context':'https://schema.org','@type':'CollectionPage',name:`Products | ${name}`,description,url:path,mainEntity:{'@type':'ItemList',numberOfItems:this.products().length,itemListElement:this.products().map((p,index)=>({'@type':'ListItem',position:index+1,name:p.product_name,url:`${path}/${p.slug||p.public_id||p.id}`}))}};
   this.seo.update(`Products | ${name}`,description,path,schema);
   return;
  }
  this.loading.set(false);
  const isAbout=this.section==='about';
  const description=isAbout?(detail.storefront.description||detail.business.business_description||`Learn more about ${name}.`):`Contact ${name} using its published business contact details.`;
  const schema={'@context':'https://schema.org','@type':isAbout?'AboutPage':'ContactPage',name:`${isAbout?'About':'Contact'} | ${name}`,description,url:path,about:{'@type':'LocalBusiness',name}};
  this.seo.update(`${isAbout?'About':'Contact'} | ${name}`,description,path,schema);
 }
 productRoute(p:MarketplaceProduct):string{const slug=p.slug||p.product_name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'product';return `${slug}-${p.public_id||p.id}`;}
}
