import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthUser } from '../../../../core/auth/auth.models';
type AuthMode='login'|'register';
@Component({selector:'app-auth-panel',imports:[ReactiveFormsModule],templateUrl:'./auth-panel.html',styleUrl:'./auth-panel.scss'})
export class AuthPanel{
 private readonly fb=inject(FormBuilder);private readonly auth=inject(AuthService);
 @Input() initialMode:AuthMode='login';@Input() contextualReason='';@Input() compact=false;
 @Output() authenticated=new EventEmitter<AuthUser>();@Output() close=new EventEmitter<void>();
 readonly mode=signal<AuthMode>('login');readonly credentialsVisible=signal(false);readonly passwordVisible=signal(false);readonly busy=signal(false);readonly error=signal('');readonly providerMessage=signal('');
 readonly loginForm=this.fb.nonNullable.group({identifier:['',[Validators.required,Validators.maxLength(190)]],password:['',[Validators.required]]});
 readonly registerForm=this.fb.nonNullable.group({full_name:['',[Validators.required,Validators.maxLength(150)]],email:['',[Validators.email,Validators.maxLength(190)]],mobile:['',[Validators.maxLength(25)]],password:['',[Validators.required,Validators.minLength(8)] ]});
 ngOnInit():void{this.mode.set(this.initialMode);}
 setMode(mode:AuthMode):void{this.mode.set(mode);this.credentialsVisible.set(true);this.error.set('');this.providerMessage.set('');}
 revealCredentials():void{this.credentialsVisible.set(true);this.providerMessage.set('');}
 async submit():Promise<void>{
  if(this.busy())return;this.error.set('');
  if(this.mode()==='login'){
   if(this.loginForm.invalid){this.loginForm.markAllAsTouched();return;}this.busy.set(true);
   try{this.authenticated.emit(await this.auth.login(this.loginForm.getRawValue()));}catch(e){this.error.set(this.auth.errorMessage(e));}finally{this.busy.set(false);}return;
  }
  if(this.registerForm.invalid){this.registerForm.markAllAsTouched();return;}
  const {email,mobile,...details}=this.registerForm.getRawValue();
  if(!email.trim()&&!mobile.trim()){this.error.set('Enter an email address or mobile number to continue.');return;}
  this.busy.set(true);
  try{this.authenticated.emit(await this.auth.register({...details,...(email.trim()?{email:email.trim()}:{}),...(mobile.trim()?{mobile:mobile.trim()}:{})}));}catch(e){this.error.set(this.auth.errorMessage(e));}finally{this.busy.set(false);}
 }
 selectProvider(provider:string):void{this.providerMessage.set(`${provider} sign-in is not connected to the BBG authentication service yet.`);}
}
