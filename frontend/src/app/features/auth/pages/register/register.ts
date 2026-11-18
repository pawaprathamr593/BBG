import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthExperienceComponent } from '../../../../shared/auth-experience/auth-experience';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: '../login/login.scss',
})
export class Register extends AuthExperienceComponent implements OnInit {
  override ngOnInit(): void {
    super.ngOnInit();
    this.activeMode.set('register');
  }
}
