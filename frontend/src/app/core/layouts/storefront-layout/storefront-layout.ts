import {Component,DestroyRef,OnInit,inject,signal} from '@angular/core';
import {ActivatedRoute,Router,RouterLink,RouterLinkActive,RouterOutlet} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MarketplaceBusinessDetail} from '../../../features/marketplace/models/marketplace.models';
import {AuthService} from '../../auth/auth.service';
import {AuthPrompt} from '../../auth/auth-prompt/auth-prompt';
import {AuthPromptService} from '../../auth/auth-prompt.service';
import {MarketplaceService} from '../../../features/marketplace/services/marketplace.service';
import {SeoService} from '../../seo/seo.service';
import {ThemeService} from '../../theme/theme.service';
@Component({selector:'app-storefront-layout',imports:[RouterLink,RouterLinkActive,RouterOutlet,AuthPrompt],templateUrl:'./storefront-layout.html',styleUrl:'./storefront-layout.scss'})
export class StorefrontLayout implements OnInit{
 private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly destroyRef=inject(DestroyRef);private readonly marketplace=inject(MarketplaceService);private readonly seo=inject(SeoService);private readonly themeService=inject(ThemeService);private readonly authPrompt=inject(AuthPromptService);
 protected readonly auth=inject(AuthService);protected readonly detail=signal<MarketplaceBusinessDetail|null>(null);protected readonly loading=signal(true);protected readonly error=signal('');protected readonly year=new Date().getFullYear();protected readonly slug=signal('');
 ngOnInit():void{this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params=>{this.slug.set(params.get('businessSlug')??'');this.detail.set(null);void this.loadBusiness();});}
 protected async loadBusiness():Promise<void>{
  const slug=this.slug();if(!slug){this.error.set('This storefront address is incomplete.');this.loading.set(false);return;}
  this.loading.set(true);this.error.set('');
  try{const detail=await this.marketplace.getBusiness(slug);if(slug!==this.slug())return;this.detail.set(detail);this.seo.updateBusiness({name:detail.storefront.title||detail.business.business_name,description:detail.storefront.description||detail.business.business_description,url:`/businesses/${encodeURIComponent(slug)}`,city:detail.business.city,state:detail.business.state,countryCode:detail.business.address?.country_code,phone:detail.business.business_phone,email:detail.business.business_email});}
  catch(cause){if(slug===this.slug())this.error.set(cause instanceof Error?cause.message:'This storefront is not available right now.');}
  finally{if(slug===this.slug())this.loading.set(false);}
 }
 protected get isDarkTheme():boolean{return this.themeService.resolvedTheme()==='dark';}
 protected toggleTheme():void{this.themeService.toggle();}
 protected get brandName():string{const data=this.detail();return data?.storefront.title||data?.business.business_name||'Business storefront';}
 protected get brandInitial():string{return this.brandName.slice(0,1).toUpperCase();}
 protected get loginReturnUrl():string{return this.router.url;}
 protected openCartAuth(event:MouseEvent):void{const anchor=event.currentTarget;if(anchor instanceof HTMLElement)this.authPrompt.open('Please sign in to view your business cart.',anchor,()=>this.router.navigate(['/businesses',this.slug(),'cart']).then(()=>undefined));}
 protected async signOut():Promise<void>{const returnUrl=this.router.url;try{await this.auth.logout();}finally{await this.router.navigateByUrl(returnUrl);}}
}