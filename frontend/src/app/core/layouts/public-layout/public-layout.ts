import {Component,inject,signal} from '@angular/core';
import {Router,RouterLink,RouterLinkActive,RouterOutlet} from '@angular/router';
import {AuthService} from '../../auth/auth.service';
import {AuthPrompt} from '../../auth/auth-prompt/auth-prompt';
import {ThemeService} from '../../theme/theme.service';
import {PermissionService} from '../../permissions/permission.service';
@Component({selector:'app-public-layout',imports:[RouterLink,RouterLinkActive,RouterOutlet,AuthPrompt],templateUrl:'./public-layout.html',styleUrl:'./public-layout.scss'})
export class PublicLayout{
 protected readonly menuOpen=signal(false);protected readonly currentYear=new Date().getFullYear();protected readonly auth=inject(AuthService);
 private readonly themeService=inject(ThemeService);private readonly permissions=inject(PermissionService);private readonly router=inject(Router);
 protected hasTenantWorkspace():boolean{return this.permissions.context()?.permissions.some(r=>r.scope_type==='TENANT')??false;}
 protected hasPlatformWorkspace():boolean{return this.permissions.context()?.permissions.some(r=>r.scope_type==='PLATFORM')??false;}
 protected get isDarkTheme():boolean{return this.themeService.resolvedTheme()==='dark';}
 protected toggleTheme():void{this.themeService.toggle();}
 protected closeMenu():void{this.menuOpen.set(false);}
 protected toggleMenu():void{this.menuOpen.update(open=>!open);}
 protected async signOut():Promise<void>{try{await this.auth.logout();}finally{this.closeMenu();await this.router.navigateByUrl('/');}}
}