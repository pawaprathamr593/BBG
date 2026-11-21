import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import {
  hasActiveEntitlement,
  hasWorkspacePermission,
} from '../../core/workspace/workspace-access';
import { createResponsiveViewMode } from '../../core/workspace/responsive-view';
import {
  CatalogueApiService,
  CatalogueCategory,
  CatalogueProduct,
  CatalogueUnit,
  ProductMedia,
} from './catalogue-api.service';
import { WorkspaceDrawer } from '../../shared/workspace-drawer/workspace-drawer';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

interface ProductForm {
  product_code: string;
  product_name: string;
  description: string;
  category_id: number | null;
  base_unit_id: number | null;
  brand_name: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  publication_status: 'DRAFT' | 'PUBLISHED';
}

const emptyProduct = (): ProductForm => ({
  product_code: '',
  product_name: '',
  description: '',
  category_id: null,
  base_unit_id: null,
  brand_name: '',
  barcode: '',
  cost_price: 0,
  selling_price: 0,
  tax_rate: 0,
  publication_status: 'DRAFT',
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-catalogue',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    WorkspaceDrawer,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
    PaginationComponent,
  ],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.scss',
})
export class Catalogue implements OnInit {
  private readonly responsiveView = createResponsiveViewMode(
    inject(DestroyRef),
    'bbg_catalogue_view',
  );
  readonly viewMode = this.responsiveView.viewMode;
  readonly setViewMode = this.responsiveView.setViewMode;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(CatalogueApiService);

  readonly tenantId = this.workspace.activeTenantId;
  readonly permissions = this.workspace.permissions;
  readonly hasPermission = computed(() =>
    hasWorkspacePermission(this.permissions(), 'TENANT', 'catalogue.view'),
  );
  readonly hasProductEntitlement = computed(() =>
    hasActiveEntitlement(this.workspace.activeTenant()?.active_entitlements, 'catalogue.enabled'),
  );
  readonly canManage = computed(() => this.hasPermission() && this.hasProductEntitlement());
  readonly canCreate = computed(
    () =>
      this.canManage() && hasWorkspacePermission(this.permissions(), 'TENANT', 'catalogue.create'),
  );
  readonly canUpdate = computed(
    () =>
      this.canManage() && hasWorkspacePermission(this.permissions(), 'TENANT', 'catalogue.update'),
  );
  readonly canDelete = computed(
    () =>
      this.canManage() && hasWorkspacePermission(this.permissions(), 'TENANT', 'catalogue.delete'),
  );
  readonly loading = signal(true);
  readonly productsLoading = signal(false);
  readonly saving = signal(false);
  readonly savingCategory = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly notice = signal('');
  readonly selectedMediaFiles = signal<File[]>([]);
  readonly existingMedia = signal<ProductMedia[]>([]);
  readonly mediaBusy = signal(false);
  readonly mediaUploadProgress = signal(0);
  readonly mediaError = signal('');
  readonly products = signal<CatalogueProduct[]>([]);
  readonly categories = signal<CatalogueCategory[]>([]);
  readonly units = signal<CatalogueUnit[]>([]);
  readonly totalProducts = signal(0);
  readonly search = signal('');
  readonly filterStatus = signal('');
  readonly selectedCategoryId = signal<number | null>(null);

  readonly pageSizeOptions = [5, 10, 20, 50];
  readonly pageSize = signal(10);
  readonly currentPage = signal(1);

  readonly showColumnMenu = signal(false);
  readonly hiddenColumns = signal<string[]>([]);
  readonly availableColumns = [
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Selling Price' },
    { key: 'cost_price', label: 'Cost Price' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'status', label: 'Publication Status' },
  ];
  readonly visibleColumns = computed(() =>
    this.availableColumns.filter((col) => this.isColumnVisible(col.key)),
  );
  readonly selectedCategory = computed(
    () => this.categories().find((c) => c.id === this.selectedCategoryId()) ?? null,
  );

  toggleColumnMenu(): void {
    this.showColumnMenu.update((v) => !v);
  }

  isColumnVisible(key: string): boolean {
    return !this.hiddenColumns().includes(key);
  }

  toggleColumn(key: string): void {
    const hidden = this.hiddenColumns();
    if (hidden.includes(key)) {
      this.hiddenColumns.set(hidden.filter((k) => k !== key));
    } else {
      this.hiddenColumns.set([...hidden, key]);
    }
  }

  resetColumns(): void {
    this.hiddenColumns.set([]);
  }

  readonly filteredProducts = computed(() => {
    const status = this.filterStatus();
    const catId = this.selectedCategoryId();
    return this.products().filter((product) => {
      if (status && product.publication_status !== status) return false;
      if (catId !== null && product.category_id !== catId) return false;
      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize())),
  );

  readonly pagedProducts = computed(() => {
    const items = this.filteredProducts();
    const safePage = Math.min(this.currentPage(), this.totalPages());
    const start = (safePage - 1) * this.pageSize();
    return items.slice(start, start + this.pageSize());
  });

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const size = parseInt(select.value, 10);
    if (!isNaN(size) && size > 0) {
      this.pageSize.set(size);
      this.currentPage.set(1);
    }
  }

  toggleCategoryFilter(categoryId: number | null): void {
    if (this.selectedCategoryId() === categoryId) {
      this.selectedCategoryId.set(null);
    } else {
      this.selectedCategoryId.set(categoryId);
    }
    this.currentPage.set(1);
  }

  readonly showForm = signal(false);
  readonly showCategoryForm = signal(false);
  readonly editingId = signal<number | null>(null);
  private readonly mediaPreviewUrls = new Map<File, string>();
  form = emptyProduct();
  categoryName = '';
  categoryDescription = '';

  async ngOnInit(): Promise<void> {
    try {
      const restored = await this.auth.restoreSession();
      if (!restored) {
        await this.router.navigate(['/login'], {
          queryParams: { returnUrl: '/dashboard/catalogue' },
        });
        return;
      }
      await this.workspace.initialize();
      if (!this.tenantId()) {
        this.loading.set(false);
        return;
      }
      if (!this.canManage()) {
        this.loading.set(false);
        return;
      }
      this.search.set(this.route.snapshot.queryParamMap.get('search') ?? '');
      this.filterStatus.set(this.route.snapshot.queryParamMap.get('status') ?? '');
      await this.load();
      this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
        const nextSearch = params.get('search') ?? '';
        const nextStatus = params.get('status') ?? '';
        const searchChanged = nextSearch !== this.search();
        this.search.set(nextSearch);
        this.filterStatus.set(nextStatus);
        this.currentPage.set(1);
        if (searchChanged && this.tenantId() && this.canManage()) void this.loadProducts();
      });
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
      this.loading.set(false);
    }
  }

  async load(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId || !this.canManage()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const [units, categories] = await Promise.all([
        this.api.listUnits(),
        this.api.listCategories(tenantId),
      ]);
      this.units.set(units);
      this.categories.set(categories);
      await this.loadProducts();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async loadProducts(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId) return;
    this.productsLoading.set(true);
    try {
      const result = await this.api.listProducts(tenantId, this.search().trim());
      this.products.set(result.items ?? []);
      this.totalProducts.set(result.pagination?.total ?? result.items?.length ?? 0);
      this.currentPage.set(1);
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.productsLoading.set(false);
    }
  }

  openCreate(): void {
    if (!this.canCreate()) return;
    this.editingId.set(null);
    this.form = emptyProduct();
    this.formError.set('');
    this.clearSelectedMedia();
    this.existingMedia.set([]);
    this.mediaError.set('');
    this.showForm.set(true);
  }

  edit(product: CatalogueProduct): void {
    if (!this.canUpdate()) return;
    this.editingId.set(product.id);
    this.form = {
      product_code: product.product_code,
      product_name: product.product_name,
      description: product.description ?? '',
      category_id: product.category_id,
      base_unit_id: product.base_unit_id,
      brand_name: product.brand_name ?? '',
      barcode: product.barcode ?? '',
      cost_price: Number(product.cost_price) || 0,
      selling_price: Number(product.selling_price) || 0,
      tax_rate: Number(product.tax_rate) || 0,
      publication_status: product.publication_status,
    };
    this.formError.set('');
    this.clearSelectedMedia();
    this.existingMedia.set([]);
    this.mediaError.set('');
    this.showForm.set(true);
    const tenantId = this.tenantId();
    if (tenantId)
      this.api
        .listProductMedia(tenantId, product.id)
        .then((items) => this.existingMedia.set(items))
        .catch((error) => this.mediaError.set(this.auth.errorMessage(error)));
  }

  closeForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
    this.formError.set('');
    this.clearSelectedMedia();
    this.existingMedia.set([]);
    this.mediaError.set('');
  }

  openCategoryCreate(): void {
    if (!this.canCreate()) return;
    this.categoryName = '';
    this.categoryDescription = '';
    this.showCategoryForm.set(true);
  }

  closeCategoryForm(): void {
    if (this.savingCategory()) return;
    this.showCategoryForm.set(false);
  }

  private clearSelectedMedia(): void {
    for (const url of this.mediaPreviewUrls.values()) URL.revokeObjectURL(url);
    this.mediaPreviewUrls.clear();
    this.selectedMediaFiles.set([]);
  }

  previewMediaUrl(file: File): string | null {
    return this.mediaPreviewUrls.get(file) ?? null;
  }

  selectMedia(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addMediaFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  allowMediaDrop(event: DragEvent): void {
    event.preventDefault();
  }

  dropMedia(event: DragEvent): void {
    event.preventDefault();
    this.addMediaFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private addMediaFiles(files: File[]): void {
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/rtf',
    ]);
    const invalid = files.find(
      (file) => !allowed.has(file.type) || file.size < 1 || file.size > 100 * 1024 * 1024,
    );
    if (invalid)
      this.mediaError.set(`"${invalid.name}" is not a supported file or exceeds the 100 MB limit.`);
    else {
      this.mediaError.set('');
      for (const file of files) {
        if (
          file.type.startsWith('image/') ||
          file.type.startsWith('video/') ||
          file.type.startsWith('audio/')
        ) {
          this.mediaPreviewUrls.set(file, URL.createObjectURL(file));
        }
      }
      this.selectedMediaFiles.update((current) => [...current, ...files]);
    }
  }

  removeSelectedMedia(index: number): void {
    const file = this.selectedMediaFiles()[index];
    const previewUrl = file ? this.mediaPreviewUrls.get(file) : undefined;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file) this.mediaPreviewUrls.delete(file);
    this.selectedMediaFiles.update((files) => files.filter((_, position) => position !== index));
  }

  async removeExistingMedia(media: ProductMedia): Promise<void> {
    const tenantId = this.tenantId();
    const productId = this.editingId();
    if (
      !tenantId ||
      !productId ||
      !this.canUpdate() ||
      this.mediaBusy() ||
      !window.confirm(`Remove "${media.original_file_name}"?`)
    )
      return;
    this.mediaBusy.set(true);
    this.mediaError.set('');
    try {
      await this.api.deleteProductMedia(tenantId, productId, media.id);
      this.existingMedia.update((items) => items.filter((item) => item.id !== media.id));
    } catch (error) {
      this.mediaError.set(this.auth.errorMessage(error));
    } finally {
      this.mediaBusy.set(false);
    }
  }

  mediaKind(mime: string): string {
    return mime.startsWith('image/')
      ? 'IMAGE'
      : mime.startsWith('video/')
        ? 'VIDEO'
        : mime.startsWith('audio/')
          ? 'AUDIO'
          : mime === 'application/pdf'
            ? 'PDF'
            : 'DOC';
  }

  formatFileSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async saveProduct(): Promise<void> {
    const tenantId = this.tenantId();
    const editingId = this.editingId();
    const canSave = editingId !== null ? this.canUpdate() : this.canCreate();
    if (!tenantId || !canSave || !this.form.base_unit_id) {
      this.formError.set('Select a valid base unit before saving.');
      return;
    }
    if (
      [this.form.cost_price, this.form.selling_price, this.form.tax_rate].some(
        (value) => !Number.isFinite(Number(value)) || Number(value) < 0,
      ) ||
      this.form.tax_rate > 100
    ) {
      this.formError.set('Prices must be non-negative and tax rate must be between 0 and 100.');
      return;
    }
    const payload = {
      product_code: this.form.product_code.trim(),
      product_name: this.form.product_name.trim(),
      description: this.form.description.trim(),
      category_id: this.form.category_id,
      base_unit_id: this.form.base_unit_id,
      brand_name: this.form.brand_name.trim(),
      barcode: this.form.barcode.trim(),
      cost_price: this.form.cost_price,
      selling_price: this.form.selling_price,
      tax_rate: this.form.tax_rate,
      publication_status: this.form.publication_status,
    };
    this.saving.set(true);
    this.formError.set('');
    try {
      const saved = editingId
        ? await this.api.updateProduct(tenantId, editingId, payload)
        : await this.api.createProduct(tenantId, payload);
      const productId = editingId ?? Number(saved.id);
      if (!productId)
        throw new Error(
          'Product was saved but its identifier was not returned. Media upload could not continue.',
        );
      this.editingId.set(productId);
      const files = this.selectedMediaFiles();
      if (files.length) {
        this.mediaBusy.set(true);
        for (const file of files) {
          this.mediaUploadProgress.set(0);
          const displayOrder = this.existingMedia().length;
          const makePrimary =
            !this.existingMedia().some((media) => media.is_primary === 1) &&
            file.type.startsWith('image/') &&
            !files
              .slice(0, files.indexOf(file))
              .some((candidate) => candidate.type.startsWith('image/'));
          await this.api.uploadAndLinkProductMedia(
            tenantId,
            productId,
            file,
            displayOrder,
            makePrimary,
            (progress) => this.mediaUploadProgress.set(progress),
          );
          this.selectedMediaFiles.update((remaining) =>
            remaining.filter((candidate) => candidate !== file),
          );
          this.existingMedia.set(await this.api.listProductMedia(tenantId, productId));
        }
        this.mediaBusy.set(false);
        this.selectedMediaFiles.set([]);
        this.existingMedia.set(await this.api.listProductMedia(tenantId, productId));
      }
      this.showForm.set(false);
      this.clearSelectedMedia();
      this.notice.set(editingId ? 'Product and media updated.' : 'Product created as a draft.');
      await this.loadProducts();
    } catch (error) {
      this.formError.set(this.auth.errorMessage(error));
      this.mediaError.set(this.auth.errorMessage(error));
    } finally {
      this.mediaBusy.set(false);
      this.mediaUploadProgress.set(0);
      this.saving.set(false);
    }
  }

  async removeProduct(product: CatalogueProduct): Promise<void> {
    const tenantId = this.tenantId();
    if (
      !tenantId ||
      !this.canDelete() ||
      !window.confirm(`Delete "${product.product_name}" from this catalogue?`)
    )
      return;
    try {
      await this.api.deleteProduct(tenantId, product.id);
      this.notice.set('Product moved to deleted status.');
      await this.loadProducts();
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }

  async addCategory(): Promise<void> {
    const tenantId = this.tenantId();
    const name = this.categoryName.trim();
    if (!tenantId || !this.canCreate() || !name) return;
    this.savingCategory.set(true);
    this.error.set('');
    try {
      await this.api.createCategory(tenantId, name, this.categoryDescription.trim());
      this.categoryName = '';
      this.categoryDescription = '';
      this.showCategoryForm.set(false);
      this.categories.set(await this.api.listCategories(tenantId));
      this.notice.set('Category added.');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    } finally {
      this.savingCategory.set(false);
    }
  }

  async removeCategory(category: CatalogueCategory): Promise<void> {
    const tenantId = this.tenantId();
    if (
      !tenantId ||
      !this.canDelete() ||
      !window.confirm(`Delete category "${category.category_name}"?`)
    )
      return;
    try {
      await this.api.deleteCategory(tenantId, category.id);
      this.categories.set(await this.api.listCategories(tenantId));
      this.notice.set('Category deleted.');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }
}
