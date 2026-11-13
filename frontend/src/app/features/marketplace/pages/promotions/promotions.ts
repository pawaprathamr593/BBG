import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MarketplaceList, MarketplacePromotion } from '../../models/marketplace.models';
import { MarketplaceService } from '../../services/marketplace.service';

@Component({
  selector: 'app-promotions',
  imports: [DatePipe],
  templateUrl: './promotions.html',
  styleUrl: './promotions.scss',
})
export class Promotions implements OnInit {
  private readonly marketplace = inject(MarketplaceService);
  protected readonly result = signal<MarketplaceList<MarketplacePromotion> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly page = signal(1);

  ngOnInit(): void {
    void this.load();
  }

  protected async changePage(page: number): Promise<void> {
    const current = this.result();
    const totalPages = Math.ceil((current?.pagination.total ?? 0) / (current?.pagination.page_size ?? 20));
    if (page < 1 || page > totalPages) return;
    this.page.set(page);
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.result.set(await this.marketplace.listPromotions({ page: this.page(), page_size: 20 }));
    } catch (error) {
      this.result.set(null);
      this.error.set(error instanceof Error ? error.message : 'Unable to load promotions.');
    } finally {
      this.loading.set(false);
    }
  }
}
