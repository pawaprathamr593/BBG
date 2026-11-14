import { Component } from '@angular/core';
import { AuthExperienceComponent } from '../../../../shared/auth-experience/auth-experience';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [AuthExperienceComponent],
  template: '<app-auth-experience mode="register" presentation="page" />',
})
export class Register {}
