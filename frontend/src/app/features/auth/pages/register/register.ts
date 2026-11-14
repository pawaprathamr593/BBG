import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SocialAuthIntent } from '../../../../core/auth/auth.models';
import { AuthExperienceComponent } from '../../../../shared/auth-experience/auth-experience';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: '../login/login.scss',
})
export class Register extends AuthExperienceComponent {
  override mode: SocialAuthIntent = 'register';
}
