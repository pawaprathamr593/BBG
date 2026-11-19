import { ChangeDetectionStrategy, Component, DestroyRef, input, output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceContextService } from '../../../../core/workspace/workspace-context.service';
import { WorkspaceModuleApiService } from '../../../../core/workspace/workspace-module-api.service';
import { WorkspaceDrawer } from '../../../../shared/workspace-drawer/workspace-drawer';

interface ProfileForm { business_name:string; business_email:string; business_phone:string; business_description:string; address_line_1:string; address_line_2:string; city:string; state:string; postal_code:string; }
const emptyForm=():ProfileForm=>({business_name:'',business_email:'',business_phone:'',business_description:'',address_line_1:'',address_line_2:'',city:'',state:'',postal_code:''});

@Component({selector:'app-business-profile-module',standalone:true,imports:[FormsModule,WorkspaceDrawer],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./business-profile-module.html',styleUrl:'./business-profile-module.scss'})
export class BusinessProfileModule {
  readonly business=input.required<Record<string,unknown>>();
  readonly canEdit=input(false);
  readonly refreshRequested=output<void>();
  readonly drawerOpen=signal(false);
  readonly saving=signal(false);
  readonly error=signal('');
  readonly form=signal<ProfileForm>(emptyForm());
  private readonly auth=inject(AuthService);
  private readonly destroyRef=inject(DestroyRef);
  private alive=true;
  constructor(){this.destroyRef.onDestroy(()=>{this.alive=false;});}
  private readonly workspace=inject(WorkspaceContextService);
  private readonly api=inject(WorkspaceModuleApiService);
  readonly fields=[
    {key:'business_name',label:'Business name'},{key:'business_email',label:'Business email'},
    {key:'business_phone',label:'Business phone'},{key:'business_description',label:'Description',wide:true},
    {key:'address_line_1',label:'Address line 1'},{key:'address_line_2',label:'Address line 2'},
    {key:'city',label:'City'},{key:'state',label:'State'},{key:'postal_code',label:'Postal code'},
  ];
  edit():void {
    const data=this.business();if(!this.canEdit())return;
    this.form.set({
      business_name:String(data['business_name']??''),business_email:String(data['business_email']??''),
      business_phone:String(data['business_phone']??''),business_description:String(data['business_description']??''),
      address_line_1:String(data['address_line_1']??''),address_line_2:String(data['address_line_2']??''),
      city:String(data['city']??''),state:String(data['state']??''),postal_code:String(data['postal_code']??''),
    });
    this.error.set('');this.drawerOpen.set(true);
  }
  updateField(field:keyof ProfileForm,value:string):void{this.form.update(form=>({...form,[field]:value}));}
  async save():Promise<void>{
    const tenantId=this.workspace.activeTenantId(),data=this.business(),form=this.form();
    const businessId=Number(data['business_id']??data['id']??0);
    if(!tenantId||!businessId){this.error.set('Business identifiers are unavailable. Refresh the profile before editing.');return;}
    if(!form.business_name.trim()){this.error.set('Business name is required.');return;}
    if(this.saving())return;this.saving.set(true);this.error.set('');
    try{
      await this.api.request('/api/v1/business/profile/update','updateMyBusinessProfile',{
        tenant_id:tenantId,business_id:businessId,business_name:form.business_name.trim(),
        business_email:form.business_email.trim(),business_phone:form.business_phone.trim(),
        business_description:form.business_description.trim(),address_line_1:form.address_line_1.trim(),
        address_line_2:form.address_line_2.trim(),city:form.city.trim(),state:form.state.trim(),postal_code:form.postal_code.trim(),
      });
      if(!this.alive)return;
      this.drawerOpen.set(false);this.refreshRequested.emit();
    }catch(error){if(this.alive)this.error.set(this.auth.errorMessage(error));}
    finally{if(this.alive)this.saving.set(false);}
  }
  display(value:unknown):string{return value===null||value===undefined||value===''?'Not provided':String(value);}
  status():string{return String(this.business()['approval_status']??this.business()['business_approval_status']??this.business()['business_status']??'On record');}
}
