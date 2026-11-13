import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);
  protected readonly summary = signal<MarketplaceHomeSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly searchTerm = signal('');

  ngOnInit(): void { void this.load(); }

  protected onSearchInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.searchTerm.set(event.target.value);
  }

  protected async submitSearch(event: Event): Promise<void> {
    event.preventDefault();
    const search = this.searchTerm().trim();
    await this.router.navigate(['/businesses'], { queryParams: search ? { search } : {} });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.summary.set(await this.marketplace.getHomeSummary());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load the marketplace right now.');
    } finally { this.loading.set(false); }
  }
}
