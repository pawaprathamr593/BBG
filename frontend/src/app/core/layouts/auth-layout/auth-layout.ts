import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../theme/theme.service';
@Component({selector:'app-auth-layout',imports:[RouterLink,RouterOutlet],templateUrl:'./auth-layout.html',styleUrl:'./auth-layout.scss'})
export class AuthLayout {
  protected readonly currentYear=new Date().getFullYear();
  protected readonly theme=inject(ThemeService);
}
