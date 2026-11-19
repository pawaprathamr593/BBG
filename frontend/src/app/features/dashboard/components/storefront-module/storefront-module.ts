import { ChangeDetectionStrategy, Component, DestroyRef, input, output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceContextService } from '../../../../core/workspace/workspace-context.service';
import { WorkspaceModuleApiService } from '../../../../core/workspace/workspace-module-api.service';
import { WorkspaceDrawer } from '../../../../shared/workspace-drawer/workspace-drawer';

interface StorefrontForm { storefront_title:string; storefront_description:string; show_prices:boolean; accept_online_orders:boolean; whatsapp_enabled:boolean; whatsapp_number:string; theme_code:string; }
const emptyForm=():StorefrontForm=>({storefront_title:'',storefront_description:'',show_prices:false,accept_online_orders:false,whatsapp_enabled:false,whatsapp_number:'',theme_code:''});

@Component({selector:'app-storefront-module',standalone:true,imports:[FormsModule,WorkspaceDrawer],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./storefront-module.html',styleUrl:'./storefront-module.scss'})
export class StorefrontModule {
  readonly storefront=input.required<Record<string,unknown>>();
  readonly canEdit=input(false);
  readonly refreshRequested=output<void>();
  readonly form=signal<StorefrontForm>(emptyForm());
  readonly drawerOpen=signal(false);
  readonly saving=signal(false);
  readonly error=signal('');
  private readonly auth=inject(AuthService);
  private readonly destroyRef=inject(DestroyRef);
  private alive=true;
  constructor(){this.destroyRef.onDestroy(()=>{this.alive=false;});}
  private readonly workspace=inject(WorkspaceContextService);
  private readonly api=inject(WorkspaceModuleApiService);
  readonly fields=[
    {key:'storefront_title',label:'Storefront title'},{key:'storefront_description',label:'Description',wide:true},
    {key:'show_prices',label:'Show product prices',boolean:true},{key:'accept_online_orders',label:'Accept online orders',boolean:true},
    {key:'whatsapp_enabled',label:'WhatsApp contact',boolean:true},{key:'whatsapp_number',label:'WhatsApp number'},
    {key:'theme_code',label:'Theme code'},
  ];
  edit():void {
    const data=this.storefront();if(!this.canEdit())return;
    this.form.set({
      storefront_title:String(data['storefront_title']??''),storefront_description:String(data['storefront_description']??''),
      show_prices:data['show_prices']===true||Number(data['show_prices'])===1,
      accept_online_orders:data['accept_online_orders']===true||Number(data['accept_online_orders'])===1,
      whatsapp_enabled:data['whatsapp_enabled']===true||Number(data['whatsapp_enabled'])===1,
      whatsapp_number:String(data['whatsapp_number']??''),theme_code:String(data['theme_code']??''),
    });
    this.error.set('');this.drawerOpen.set(true);
  }
  updateText(field:'storefront_title'|'storefront_description'|'whatsapp_number'|'theme_code',value:string):void{this.form.update(form=>({...form,[field]:value}));}
  updateToggle(field:'show_prices'|'accept_online_orders'|'whatsapp_enabled',value:boolean):void{this.form.update(form=>({...form,[field]:value}));}
  async save():Promise<void>{
    const tenantId=this.workspace.activeTenantId(),form=this.form();
    if(!tenantId||!form.storefront_title.trim()){this.error.set('A storefront title and active business workspace are required.');return;}
    if(this.saving())return;this.saving.set(true);this.error.set('');
    try{
      await this.api.request('/api/v1/business/storefront/update','updateMyStorefront',{
        tenant_id:tenantId,storefront_title:form.storefront_title.trim(),storefront_description:form.storefront_description.trim(),
        show_prices:form.show_prices,accept_online_orders:form.accept_online_orders,whatsapp_enabled:form.whatsapp_enabled,
        whatsapp_number:form.whatsapp_enabled?form.whatsapp_number.trim():'',theme_code:form.theme_code.trim(),
      });
      if(!this.alive)return;
      this.drawerOpen.set(false);this.refreshRequested.emit();
    }catch(error){if(this.alive)this.error.set(this.auth.errorMessage(error));}
    finally{if(this.alive)this.saving.set(false);}
  }
  async togglePublication():Promise<void>{
    if(!this.canEdit()||this.saving())return;
    const publish=this.status()!=='PUBLISHED';
    if(!window.confirm(publish?'Publish this storefront now?':'Unpublish this storefront?'))return;
    const tenantId=this.workspace.activeTenantId();if(!tenantId)return;
    this.saving.set(true);this.error.set('');
    try{
      await this.api.request(publish?'/api/v1/business/storefront/publish':'/api/v1/business/storefront/unpublish',
        publish?'publishMyStorefront':'unpublishMyStorefront',{tenant_id:tenantId});
      this.refreshRequested.emit();
    }catch(error){if(this.alive)this.error.set(this.auth.errorMessage(error));}
    finally{if(this.alive)this.saving.set(false);}
  }
  display(value:unknown,boolean=false):string{return boolean?(value===true||Number(value)===1?'Enabled':'Disabled'):(value===null||value===undefined||value===''?'Not provided':String(value));}
  status():string{return String(this.storefront()['publication_status']??'Not published');}
}
