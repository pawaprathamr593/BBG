import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
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
    void this.loadCategories();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const requestedPage = Number(params.get('page') ?? 1);
        this.page.set(Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
        this.filters.patchValue({
          search: params.get('search') ?? '',
          city: params.get('city') ?? '',
          state: params.get('state') ?? '',
          category_id: params.get('category_id') ?? '',
        }, { emitEvent: false });
        void this.load();
      });
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
    const raw = this.filters.getRawValue();
    const navigated = await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: raw.search.trim() || null,
        city: raw.city.trim() || null,
        state: raw.state.trim() || null,
        category_id: raw.category_id || null,
        page: 1,
      },
      queryParamsHandling: 'merge',
    });
    if (!navigated) {
      this.page.set(1);
      await this.load();
    }
  }

  protected async changePage(nextPage: number): Promise<void> {
    const totalPages = this.totalPages(this.businesses()?.pagination.total ?? 0, this.businesses()?.pagination.page_size ?? 20);
    if (nextPage < 1 || nextPage > totalPages) return;
    const navigated = await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: nextPage },
      queryParamsHandling: 'merge',
    });
    if (!navigated) {
      this.page.set(nextPage);
      await this.load();
    }
  }

  protected async clearFilters(): Promise<void> {
    this.filters.reset({ search: '', city: '', state: '', category_id: '' });
    const navigated = await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: null, city: null, state: null, category_id: null, page: 1 },
      queryParamsHandling: 'merge',
    });
    if (!navigated) {
      this.page.set(1);
      await this.load();
    }
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
