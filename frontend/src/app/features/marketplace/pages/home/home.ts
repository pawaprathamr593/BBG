import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketplaceService } from '../../services/marketplace.service';
import { MarketplaceHomeSummary } from '../../models/marketplace.models';

@Component({
  selector: 'app-marketplace-home',
  imports: [DatePipe, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly marketplace = inject(MarketplaceService);
  protected readonly summary = signal<MarketplaceHomeSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.summary.set(await this.marketplace.getHomeSummary());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load the marketplace right now.');
    } finally {
      this.loading.set(false);
    }
  }
}
