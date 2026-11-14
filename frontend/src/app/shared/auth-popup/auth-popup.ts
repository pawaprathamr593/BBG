import { Component, HostListener, inject } from '@angular/core';
import { AuthDialogService } from '../../core/auth/auth-dialog.service';
import { AuthExperienceComponent } from '../auth-experience/auth-experience';

@Component({
  selector: 'app-auth-popup',
  standalone: true,
  imports: [AuthExperienceComponent],
  templateUrl: './auth-popup.html',
  styleUrl: './auth-popup.scss',
})
export class AuthPopupComponent {
  readonly dialog = inject(AuthDialogService);

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.dialog.state()) this.dialog.close();
  }

  close(): void {
    this.dialog.close();
  }

  async authenticated(): Promise<void> {
    await this.dialog.complete();
  }
}
