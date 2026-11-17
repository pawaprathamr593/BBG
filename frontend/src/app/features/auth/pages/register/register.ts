import {Component,inject} from '@angular/core';
import {ActivatedRoute,Router} from '@angular/router';
import {AuthPanel} from '../../components/auth-panel/auth-panel';
@Component({selector:'app-register',imports:[AuthPanel],templateUrl:'./register.html',styleUrl:'../login/login.scss'})
export class Register{
 private readonly router=inject(Router);private readonly route=inject(ActivatedRoute);
 protected async onAuthenticated():Promise<void>{await this.router.navigateByUrl(this.safeReturnUrl());}
 private safeReturnUrl():string{
  const candidate=this.route.snapshot.queryParamMap.get('returnUrl')??'/dashboard';
  return candidate.startsWith('/')&&!candidate.startsWith('//')&&!/^\/(login|register)(?:[/?#]|$)/.test(candidate)?candidate:'/dashboard';
 }
}