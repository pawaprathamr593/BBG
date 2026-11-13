import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-info-page',
  imports: [RouterLink],
  templateUrl: './info-page.html',
  styleUrl: './info-page.scss',
})
export class InfoPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = this.route.snapshot.data['title'] as string;
  protected readonly message = this.route.snapshot.data['message'] as string;
  protected readonly actionLabel = this.route.snapshot.data['actionLabel'] as string;
  protected readonly actionPath = this.route.snapshot.data['actionPath'] as string;
}
