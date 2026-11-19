import { ChangeDetectionStrategy, Component, input, output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceModuleApiService } from '../../../../core/workspace/workspace-module-api.service';
import { WorkspaceDrawer } from '../../../../shared/workspace-drawer/workspace-drawer';

interface PersonalProfileForm { full_name:string; email:string; mobile:string; }
const emptyProfile=():PersonalProfileForm=>({full_name:'',email:'',mobile:''});

@Component({selector:'app-personal-account-module',standalone:true,imports:[FormsModule,WorkspaceDrawer],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./personal-account-module.html',styleUrl:'./personal-account-module.scss'})
export class PersonalAccountModule {
  readonly profile=input.required<Record<string,unknown>>();
  readonly canEdit=input(false);
  readonly refreshRequested=output<void>();
  readonly profileDrawerOpen=signal(false);
  readonly passwordDrawerOpen=signal(false);
  readonly busy=signal(false);
  readonly error=signal('');
  readonly passwordError=signal('');
  readonly form=signal<PersonalProfileForm>(emptyProfile());
  readonly currentPassword=signal('');
  readonly newPassword=signal('');
  readonly confirmPassword=signal('');
  private readonly auth=inject(AuthService);
  private readonly api=inject(WorkspaceModuleApiService);

  initials():string {
    return String(this.profile()['full_name']??'BB').trim().split(/\s+/).slice(0,2)
      .map(part=>part.charAt(0).toUpperCase()).join('')||'BB';
  }
  display(key:string):string {
    const value=this.profile()[key];return value===null||value===undefined||value===''?'Not provided':String(value);
  }
  hasPassword():boolean{return this.profile()['has_password']===true||Number(this.profile()['has_password'])===1;}

  edit():void {
    if(!this.canEdit()||this.busy())return;
    this.form.set({full_name:String(this.profile()['full_name']??''),email:String(this.profile()['email']??''),mobile:String(this.profile()['mobile']??'')});
    this.error.set('');this.profileDrawerOpen.set(true);
  }
  updateField(field:keyof PersonalProfileForm,value:string):void{this.form.update(form=>({...form,[field]:value}));}
  async saveProfile():Promise<void>{
    const form=this.form();if(!form.full_name.trim()){this.error.set('Full name is required.');return;}
    if(this.busy())return;this.busy.set(true);this.error.set('');
    try{
      await this.api.request('/api/v1/auth/profile/update','updateProfile',{
        full_name:form.full_name.trim(),email:form.email.trim(),mobile:form.mobile.trim(),
      },'authParam');
      this.profileDrawerOpen.set(false);this.refreshRequested.emit();
    }catch(error){this.error.set(this.auth.errorMessage(error));}
    finally{this.busy.set(false);}
  }

  openPassword():void {
    if(!this.canEdit()||this.busy())return;
    this.currentPassword.set('');this.newPassword.set('');this.confirmPassword.set('');
    this.passwordError.set('');this.passwordDrawerOpen.set(true);
  }
  closePassword():void {
    if(this.busy())return;
    this.passwordDrawerOpen.set(false);this.passwordError.set('');
    this.currentPassword.set('');this.newPassword.set('');this.confirmPassword.set('');
  }
  async updatePassword():Promise<void>{
    if(this.busy())return;
    const newPassword=this.newPassword();
    if(newPassword.length<8){this.passwordError.set('Use at least 8 characters for your new password.');return;}
    if(newPassword!==this.confirmPassword()){this.passwordError.set('The new password and confirmation do not match.');return;}
    if(this.hasPassword()&&!this.currentPassword()){this.passwordError.set('Enter your current password.');return;}
    this.busy.set(true);this.passwordError.set('');
    try{
      await this.api.request('/api/v1/auth/password/update','setPassword',{
        ...(this.hasPassword()?{current_password:this.currentPassword()}:{}),new_password:newPassword,
      },'authParam');
      this.passwordDrawerOpen.set(false);this.refreshRequested.emit();
    }catch(error){this.passwordError.set(this.auth.errorMessage(error));}
    finally{this.busy.set(false);}
  }
}
