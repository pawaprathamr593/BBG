import {Component,EventEmitter,Input,Output,inject,signal} from '@angular/core';
import {FormBuilder,ReactiveFormsModule,Validators} from '@angular/forms';
import {AuthService} from '../../../../core/auth/auth.service';
import {AuthUser} from '../../../../core/auth/auth.models';
type AuthMode='login'|'register';
@Component({selector:'app-auth-panel',imports:[ReactiveFormsModule],templateUrl:'./auth-panel.html',styleUrl:'./auth-panel.scss'})
export class AuthPanel{
 private readonly fb=inject(FormBuilder);private readonly auth=inject(AuthService);
 @Input() initialMode:AuthMode='login';@Input() contextualReason='';@Input() compact=false;
 @Output() authenticated=new EventEmitter<AuthUser>();@Output() close=new EventEmitter<void>();
 readonly mode=signal<AuthMode>('login');readonly credentialsVisible=signal(false);readonly passwordVisible=signal(false);readonly busy=signal(false);readonly error=signal('');readonly providerMessage=signal('');
 readonly emailOtpMode=signal(false);readonly pendingSocialTicket=signal('');readonly socialEmail=signal('');readonly socialOtp=signal('');readonly otpSent=signal(false);readonly otpBusy=signal(false);
 readonly loginForm=this.fb.nonNullable.group({identifier:['',[Validators.required,Validators.maxLength(190)]],password:['',[Validators.required]]});
 readonly registerForm=this.fb.nonNullable.group({full_name:['',[Validators.required,Validators.maxLength(150)]],email:['',[Validators.email,Validators.maxLength(190)]],mobile:['',[Validators.maxLength(25)]],password:['',[Validators.required,Validators.minLength(8)]]});
 ngOnInit():void{this.mode.set(this.initialMode);}
 setMode(mode:AuthMode):void{this.mode.set(mode);this.credentialsVisible.set(true);this.error.set('');this.providerMessage.set('');}
 revealCredentials():void{this.credentialsVisible.set(true);this.providerMessage.set('');}
 backToSocial():void{this.credentialsVisible.set(false);this.error.set('');this.passwordVisible.set(false);}
 togglePasswordVisibility():void{this.passwordVisible.update(value=>!value);}
 requestPasswordReset():void{this.providerMessage.set('Password recovery is not available until the BBG password-reset backend flow is configured.');}
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
 async selectProvider(provider:string):Promise<void>{
  const normalized=provider.toLowerCase();
  if(!['google','apple','facebook','instagram'].includes(normalized))return;
  this.busy.set(true);this.error.set('');this.providerMessage.set('');
  try{
   const result=await this.auth.startSocialLogin(normalized as 'google'|'apple'|'facebook'|'instagram');
   if(result.status==='SUCCESS'){this.authenticated.emit(result.user);return;}
   this.emailOtpMode.set(true);this.pendingSocialTicket.set(result.ticket);this.socialEmail.set(result.email??'');this.socialOtp.set('');this.otpSent.set(false);this.credentialsVisible.set(true);
   this.providerMessage.set('Verify your email address to securely connect this sign-in method.');
  }catch(e){this.error.set(this.auth.errorMessage(e));}finally{this.busy.set(false);}
 }
 async sendSocialEmailOtp():Promise<void>{
  const email=this.socialEmail().trim();const ticket=this.pendingSocialTicket();
  if(!ticket||!email){this.error.set('Enter your email address to continue.');return;}
  this.otpBusy.set(true);this.error.set('');
  try{const result=await this.auth.requestSocialEmailOtp(ticket,email);this.socialEmail.set(email);this.otpSent.set(true);this.providerMessage.set(`Verification code sent to ${result.email}. It expires in ${Math.ceil(result.expires_in/60)} minutes.`);}
  catch(e){this.error.set(this.auth.errorMessage(e));}finally{this.otpBusy.set(false);}
 }
 async verifySocialEmailOtp():Promise<void>{
  const email=this.socialEmail().trim(),code=this.socialOtp().trim(),ticket=this.pendingSocialTicket();
  if(!ticket||!email||!/^\d{6}$/.test(code)){this.error.set('Enter the six-digit code sent to your email.');return;}
  this.otpBusy.set(true);this.error.set('');
  try{this.authenticated.emit(await this.auth.verifySocialEmailOtp(ticket,email,code));this.emailOtpMode.set(false);}
  catch(e){this.error.set(this.auth.errorMessage(e));}finally{this.otpBusy.set(false);}
 }
 cancelSocialEmailOtp():void{this.emailOtpMode.set(false);this.pendingSocialTicket.set('');this.socialOtp.set('');this.otpSent.set(false);this.error.set('');this.providerMessage.set('');}

}