import { Component } from '@angular/core';
import { AuthExperienceComponent } from '../../../../shared/auth-experience/auth-experience';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [AuthExperienceComponent],
  template: '<app-auth-experience mode="login" presentation="page" />',
})
export class Login {}
