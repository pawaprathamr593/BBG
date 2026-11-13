import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketplaceBusiness, MarketplaceCategory, MarketplaceList } from '../../models/marketplace.models';
import { MarketplaceService } from '../../services/marketplace.service';

@Component({
  selector: 'app-business-directory',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './business-directory.html',
  styleUrl: './business-directory.scss',
})
export class BusinessDirectory implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly marketplace = inject(MarketplaceService);
  protected readonly businesses = signal<MarketplaceList<MarketplaceBusiness> | null>(null);
  protected readonly categories = signal<MarketplaceCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly page = signal(1);
  protected readonly filters = this.fb.nonNullable.group({
    search: [''],
    city: [''],
    state: [''],
    category_id: [''],
  });

  ngOnInit(): void {
    const categoryId = this.route.snapshot.queryParamMap.get('category_id') ?? '';
    if (categoryId) this.filters.controls.category_id.setValue(categoryId);
    void this.loadCategories();
    void this.load();
  }

  protected totalPages(total: number, pageSize: number): number {
    return Math.max(1, Math.ceil(total / pageSize));
  }

  protected async loadCategories(): Promise<void> {
    try {
      this.categories.set(await this.marketplace.listCategories());
    } catch {
      // Directory search remains usable when category discovery is unavailable.
    }
  }

  protected async search(): Promise<void> {
    this.page.set(1);
    await this.load();
  }

  protected async changePage(nextPage: number): Promise<void> {
    const totalPages = this.totalPages(this.businesses()?.pagination.total ?? 0, this.businesses()?.pagination.page_size ?? 20);
    if (nextPage < 1 || nextPage > totalPages) return;
    this.page.set(nextPage);
    await this.load();
  }

  protected async clearFilters(): Promise<void> {
    this.filters.reset({ search: '', city: '', state: '', category_id: '' });
    this.page.set(1);
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    const raw = this.filters.getRawValue();
    const categoryId = raw.category_id ? Number(raw.category_id) : undefined;
    try {
      this.businesses.set(await this.marketplace.listBusinesses({
        page: this.page(),
        page_size: 20,
        ...(raw.search.trim() ? { search: raw.search.trim() } : {}),
        ...(raw.city.trim() ? { city: raw.city.trim() } : {}),
        ...(raw.state.trim() ? { state: raw.state.trim() } : {}),
        ...(categoryId && Number.isInteger(categoryId) && categoryId > 0 ? { category_id: categoryId } : {}),
      }));
    } catch (error) {
      this.businesses.set(null);
      this.error.set(error instanceof Error ? error.message : 'Unable to load businesses.');
    } finally {
      this.loading.set(false);
    }
  }
}
