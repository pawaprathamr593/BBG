import { ChangeDetectionStrategy, Component, DestroyRef, input, output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceModuleApiService } from '../../../../core/workspace/workspace-module-api.service';
import { WorkspaceDrawer } from '../../../../shared/workspace-drawer/workspace-drawer';

interface Address { [key:string]:unknown; }
interface AddressForm { recipient_name:string; mobile:string; address_line_1:string; address_line_2:string; city:string; state:string; postal_code:string; country_code:string; address_label:string; is_default:boolean; }
const emptyForm=():AddressForm=>({recipient_name:'',mobile:'',address_line_1:'',address_line_2:'',city:'',state:'',postal_code:'',country_code:'IN',address_label:'Home',is_default:false});

@Component({selector:'app-personal-addresses-module',standalone:true,imports:[FormsModule,WorkspaceDrawer],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./personal-addresses-module.html',styleUrl:'./personal-addresses-module.scss'})
export class PersonalAddressesModule {
 readonly addresses=input<Address[]>([]); readonly canManage=input(false); readonly refreshRequested=output<void>();
 readonly drawerOpen=signal(false);readonly editingId=signal<number|null>(null);readonly form=signal<AddressForm>(emptyForm());
 readonly busy=signal(false);readonly error=signal('');readonly notice=signal('');
 private readonly auth=inject(AuthService);private readonly api=inject(WorkspaceModuleApiService);
 private readonly destroyRef=inject(DestroyRef);private alive=true;
 constructor(){this.destroyRef.onDestroy(()=>{this.alive=false;});}
 create():void{if(!this.canManage()||this.busy())return;this.editingId.set(null);this.form.set(emptyForm());this.error.set('');this.drawerOpen.set(true);}
 edit(address:Address):void{
  if(!this.canManage()||this.busy())return;const id=Number(address['address_id']??address['id']??0);if(!id)return;
  this.editingId.set(id);this.form.set({
   recipient_name:String(address['recipient_name']??''),mobile:String(address['mobile']??''),
   address_line_1:String(address['address_line_1']??''),address_line_2:String(address['address_line_2']??''),
   city:String(address['city']??''),state:String(address['state']??''),postal_code:String(address['postal_code']??''),
   country_code:String(address['country_code']??'IN'),address_label:String(address['address_label']??'Home'),
   is_default:Number(address['is_default']??0)===1,
  });this.error.set('');this.drawerOpen.set(true);
 }
 updateField(field:keyof AddressForm,value:string|boolean):void{this.form.update(form=>({...form,[field]:value}) as AddressForm);}
 async save():Promise<void>{
  const form=this.form(),id=this.editingId();if(!this.canManage()||!form.address_line_1.trim()){this.error.set('Address line 1 is required.');return;}
  if(this.busy())return;this.busy.set(true);this.error.set('');
  const payload={address_line_1:form.address_line_1.trim(),recipient_name:form.recipient_name.trim(),mobile:form.mobile.trim(),
   address_line_2:form.address_line_2.trim(),city:form.city.trim(),state:form.state.trim(),postal_code:form.postal_code.trim(),
   country_code:form.country_code.trim().toUpperCase(),address_label:form.address_label.trim(),
   ...(id!==null?{address_id:id,is_default:form.is_default?1:0}:{})};
  try{
   await this.api.request(id===null?'/api/v1/customers/addresses/create':'/api/v1/customers/addresses/update',
    id===null?'createMyAddress':'updateMyAddress',payload,'customerParam');
   if(!this.alive)return;this.notice.set(id===null?'Address added.':'Address updated.');this.drawerOpen.set(false);this.refreshRequested.emit();
  }catch(error){if(this.alive)this.error.set(this.auth.errorMessage(error));}finally{if(this.alive)this.busy.set(false);}
 }
 async setDefault(address:Address):Promise<void>{
  const id=Number(address['address_id']??address['id']??0);if(!id||!this.canManage()||this.busy())return;
  this.busy.set(true);this.error.set('');
  try{await this.api.request('/api/v1/customers/addresses/default','setDefaultAddress',{address_id:id},'customerParam');if(!this.alive)return;this.notice.set('Default address updated.');this.refreshRequested.emit();}
  catch(error){if(this.alive)this.error.set(this.auth.errorMessage(error));}finally{if(this.alive)this.busy.set(false);}
 }
 async remove(address:Address):Promise<void>{
  const id=Number(address['address_id']??address['id']??0);if(!id||!this.canManage()||this.busy())return;
  if(!window.confirm('Delete this saved address?'))return;this.busy.set(true);this.error.set('');
  try{await this.api.request('/api/v1/customers/addresses/delete','deleteMyAddress',{address_id:id},'customerParam');if(!this.alive)return;this.notice.set('Address deleted.');this.refreshRequested.emit();}
  catch(error){this.error.set(this.auth.errorMessage(error));}finally{if(this.alive)this.busy.set(false);}
 }
 label(address:Address):string{return String(address['address_label']??'Address');}
 value(address:Address,key:string):string{return String(address[key]??'').trim();}
 isDefault(address:Address):boolean{return Number(address['is_default']??0)===1;}
}
