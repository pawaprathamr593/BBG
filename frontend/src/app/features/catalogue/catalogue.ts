import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import { hasActiveEntitlement, hasWorkspacePermission } from '../../core/workspace/workspace-access';
import { CatalogueApiService, CatalogueCategory, CatalogueProduct, CatalogueUnit, ProductMedia } from './catalogue-api.service';
import { WorkspaceDrawer } from '../../shared/workspace-drawer/workspace-drawer';

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
  product_code: '', product_name: '', description: '', category_id: null, base_unit_id: null,
  brand_name: '', barcode: '', cost_price: 0, selling_price: 0, tax_rate: 0, publication_status: 'DRAFT',
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-catalogue',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, WorkspaceDrawer],
  templateUrl: './catalogue.html',
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .catalogue-page{width:100%;max-width:none;box-sizing:border-box;margin:0;padding:34px 32px 60px}
    .page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:28px}
    .back-link,.text-link{color:var(--brand);font-size:.82rem;font-weight:700;text-decoration:none}
    .eyebrow{margin:18px 0 8px;color:var(--brand);font-size:.68rem;font-weight:800;letter-spacing:.14em}
    h1{margin:0;font-size:clamp(2rem,4vw,2.8rem);letter-spacing:-.05em} .subtitle{color:var(--text-secondary);margin:10px 0 0}
    .primary-button,.secondary-button{border:0;border-radius:9px;padding:11px 16px;font:inherit;font-size:.82rem;font-weight:750;cursor:pointer}
    .primary-button{color:#fff;background:var(--brand)} .secondary-button{color:var(--text-primary);background:var(--surface-muted);border:1px solid var(--border)}
    button:disabled{opacity:.5;cursor:not-allowed}
    .state-panel,.products-panel,.categories-panel{background:var(--surface-card);border:1px solid var(--border);border-radius:15px}
    .state-panel{padding:28px;display:grid;gap:8px}.state-panel p{color:var(--text-secondary);margin:0}.state-panel.error{border-color:#d97777}
    .spinner{width:22px;height:22px;border:2px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
    .stats-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}
    .stats-row article{padding:17px 20px;background:var(--surface-card);border:1px solid var(--border);border-radius:13px;display:grid;gap:8px}.stats-row span{color:var(--text-secondary);font-size:.78rem}.stats-row strong{font-size:1.7rem}
    .catalogue-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:start}
    .products-panel,.categories-panel{padding:20px;min-width:0}.panel-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.panel-heading h2{margin:0;font-size:1.1rem}.panel-heading p{margin:6px 0 0;color:var(--text-secondary);font-size:.8rem}
    .count-pill,.status{display:inline-flex;padding:5px 9px;border-radius:30px;background:var(--surface-muted);font-size:.7rem;font-weight:750}
    .toolbar{display:flex;gap:9px;margin:18px 0}.search-box{display:flex;align-items:center;gap:8px;flex:1;border:1px solid var(--border);border-radius:9px;padding:0 11px}.search-box span{font-size:1.2rem;color:var(--text-secondary)}.search-box input{width:100%;height:40px;border:0;outline:0;background:transparent;color:var(--text-primary);font:inherit;font-size:.82rem}
    .table-wrap{overflow:auto}.product-cell{display:flex;align-items:center;gap:10px;min-width:190px}.product-cell img,.product-placeholder{width:46px;height:42px;object-fit:cover;border-radius:7px;border:1px solid var(--border);background:var(--surface-muted)}.product-placeholder{display:grid;place-items:center;color:var(--text-secondary);font-size:1.2rem}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th{padding:11px 9px;color:var(--text-secondary);font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)}td{padding:14px 9px;border-bottom:1px solid var(--border);font-size:.8rem}td strong,td small{display:block}td small{margin-top:4px;color:var(--text-secondary);font-size:.7rem}.actions-heading{text-align:right}.actions{text-align:right}.actions button{border:0;background:transparent;color:var(--brand);font:inherit;font-size:.76rem;font-weight:700;cursor:pointer;margin-left:9px}.actions .danger-link{color:#c44747}.status.published{color:#137a51;background:#e7f6ee}
    .table-footer{display:flex;justify-content:space-between;align-items:center;padding-top:14px;color:var(--text-secondary);font-size:.75rem}.inline-state,.empty-state{padding:42px 12px;text-align:center;color:var(--text-secondary)}.empty-state{display:grid;justify-items:center;gap:9px}.empty-state>span{font-size:2rem}.empty-state strong{color:var(--text-primary)}.empty-state p{margin:0 0 8px;font-size:.82rem}
    .category-form{display:grid;gap:12px;margin:18px 0}.category-form label,.form-grid label{display:grid;gap:6px;font-size:.75rem;font-weight:700}.category-form input,.form-grid input,.form-grid select,.form-grid textarea{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid var(--border);border-radius:8px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.8rem}.optional{color:var(--text-secondary);font-weight:400}.full-width{width:100%}.category-list{list-style:none;margin:0;padding:0}.category-list li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 0;border-top:1px solid var(--border)}.category-list strong,.category-list small{display:block}.category-list strong{font-size:.8rem}.category-list small{margin-top:4px;color:var(--text-secondary);font-size:.7rem}.category-empty{color:var(--text-secondary);font-size:.78rem}
    .media-manager{grid-column:1/-1;border:1px solid var(--border);border-radius:12px;padding:15px;background:var(--surface-page)}.media-heading{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.media-heading strong{font-size:.86rem}.media-heading p{margin:5px 0 12px;color:var(--text-secondary);font-size:.72rem}.media-heading>span{font-size:.7rem;color:var(--text-secondary)}.media-dropzone{min-height:112px;border:1px dashed var(--border);border-radius:10px;display:grid;place-items:center;align-content:center;gap:5px;cursor:pointer;text-align:center;background:var(--surface-card)}.media-dropzone input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.upload-symbol{font-size:1.4rem;color:var(--brand)}.media-dropzone strong{font-size:.78rem}.media-dropzone small{font-size:.68rem;color:var(--text-secondary)}.media-list{display:grid;gap:7px;margin-top:10px}.media-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-card);min-width:0}.media-item>div{min-width:0;flex:1}.media-item strong,.media-item small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.media-item strong{font-size:.74rem}.media-item small{margin-top:3px;color:var(--text-secondary);font-size:.66rem}.media-kind{display:grid;place-items:center;min-width:45px;height:38px;border-radius:7px;background:var(--surface-muted);font-size:.57rem;font-weight:800;color:var(--text-secondary)}.media-thumb{width:45px;height:38px;object-fit:cover;border-radius:6px}.media-preview{width:96px;height:54px;object-fit:cover;border-radius:6px;background:#111}.media-audio{width:min(210px,45%);height:34px}.media-kind{text-decoration:none}.media-progress-wrap{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:.7rem;color:var(--text-secondary)}.media-progress{flex:1;height:7px;accent-color:var(--brand)}    .icon-button{border:0;background:transparent;color:var(--text-secondary);font-size:1.25rem;cursor:pointer}.modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:rgba(12,20,16,.58)}.product-modal{width:min(720px,100%);max-height:min(90vh,900px);overflow:auto;padding:24px;background:var(--surface-card);border:1px solid var(--border);border-radius:17px;box-shadow:0 24px 80px rgba(0,0,0,.22)}.product-modal>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.product-modal header .eyebrow{margin:0 0 6px}.product-modal h2{margin:0;font-size:1.35rem}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.form-grid .span-two{grid-column:1/-1}.form-note{margin:14px 0;color:var(--text-secondary);font-size:.75rem;line-height:1.5}.form-error{color:#bd3535;font-size:.8rem}.product-modal footer{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.toast{position:fixed;right:22px;bottom:22px;z-index:1100;padding:13px 17px;background:var(--surface-card);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.15);font-size:.82rem}
    @media(max-width:900px){.catalogue-layout{grid-template-columns:1fr}.categories-panel{order:-1}}
    @media(max-width:600px){.catalogue-page{padding:26px 16px 56px}.page-header{align-items:flex-start;flex-direction:column}.stats-row{gap:8px}.stats-row article{padding:13px}.stats-row span{font-size:.68rem}.stats-row strong{font-size:1.35rem}.products-panel,.categories-panel{padding:15px}.form-grid{grid-template-columns:1fr}.form-grid .span-two{grid-column:auto}.toolbar{align-items:stretch}.table-footer{gap:10px;flex-wrap:wrap}}

    .catalogue-sections{display:grid;grid-template-columns:minmax(0,1fr);gap:18px}
    .catalogue-sections .products-panel,.catalogue-sections .categories-panel{width:100%;box-sizing:border-box}
    .categories-panel .panel-heading{align-items:center}
    .category-drawer-form{display:grid;gap:16px}
    .category-drawer-form label{display:grid;gap:7px;color:var(--text-primary);font-size:.76rem;font-weight:750}
    .category-drawer-form input,.category-drawer-form textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.82rem}
    .category-drawer-form footer{display:flex;justify-content:flex-end;gap:9px;margin-top:8px}
    .media-item .media-thumb{width:72px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--border)}
    .media-item .media-preview{width:116px;height:68px;max-width:100%;border-radius:8px;background:#111;object-fit:contain}
    .catalogue-sections .categories-panel{order:0}
    .workspace-drawer-body form>footer{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}
    .workspace-drawer-body form>footer button{min-height:40px}
    @media(max-width:600px){.catalogue-sections{gap:14px}.categories-panel .panel-heading{align-items:flex-start;flex-direction:column}}
  `],
})
export class Catalogue implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(CatalogueApiService);

  readonly tenantId = this.workspace.activeTenantId;
  readonly permissions = this.workspace.permissions;
  readonly hasPermission = computed(() => hasWorkspacePermission(this.permissions(), 'TENANT', 'catalogue.view'));
  readonly hasProductEntitlement = computed(() => hasActiveEntitlement(
    this.workspace.activeTenant()?.active_entitlements,
    'catalogue.enabled',
  ));
  readonly canManage = computed(() => this.hasPermission() && this.hasProductEntitlement());
  readonly canCreate = computed(() => this.canManage()
    && hasWorkspacePermission(this.permissions(), 'TENANT', 'catalogue.create'));
  readonly canUpdate = computed(() => this.canManage()
    && hasWorkspacePermission(this.permissions(), 'TENANT', 'catalogue.update'));
  readonly canDelete = computed(() => this.canManage()
    && hasWorkspacePermission(this.permissions(), 'TENANT', 'catalogue.delete'));
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
  readonly filteredProducts = computed(() => this.products().filter((product) => !this.filterStatus() || product.publication_status === this.filterStatus()));
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
        await this.router.navigate(['/login'], { queryParams: { returnUrl: '/dashboard/catalogue' } });
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
    if (tenantId) this.api.listProductMedia(tenantId, product.id).then((items) => this.existingMedia.set(items)).catch((error) => this.mediaError.set(this.auth.errorMessage(error)));
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

  allowMediaDrop(event: DragEvent): void { event.preventDefault(); }

  dropMedia(event: DragEvent): void {
    event.preventDefault();
    this.addMediaFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private addMediaFiles(files: File[]): void {
    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg','application/pdf','text/plain','text/csv','application/rtf']);
    const invalid = files.find((file) => !allowed.has(file.type) || file.size < 1 || file.size > 100 * 1024 * 1024);
    if (invalid) this.mediaError.set(`"${invalid.name}" is not a supported file or exceeds the 100 MB limit.`);
    else {
      this.mediaError.set('');
      for (const file of files) {
        if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
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
    if (!tenantId || !productId || !this.canUpdate() || this.mediaBusy() || !window.confirm(`Remove "${media.original_file_name}"?`)) return;
    this.mediaBusy.set(true);
    this.mediaError.set('');
    try {
      await this.api.deleteProductMedia(tenantId, productId, media.id);
      this.existingMedia.update((items) => items.filter((item) => item.id !== media.id));
    } catch (error) { this.mediaError.set(this.auth.errorMessage(error)); }
    finally { this.mediaBusy.set(false); }
  }

  mediaKind(mime: string): string {
    return mime.startsWith('image/') ? 'IMAGE' : mime.startsWith('video/') ? 'VIDEO' : mime.startsWith('audio/') ? 'AUDIO' : mime === 'application/pdf' ? 'PDF' : 'DOC';
  }

  formatFileSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async saveProduct(): Promise<void> {
    const tenantId = this.tenantId();
    const editingId = this.editingId();
    const canSave = editingId !== null ? this.canUpdate() : this.canCreate();
    if (!tenantId || !canSave || !this.form.base_unit_id) {
      this.formError.set('Select a valid base unit before saving.');
      return;
    }
    if ([this.form.cost_price, this.form.selling_price, this.form.tax_rate].some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)
      || this.form.tax_rate > 100) {
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
      if (!productId) throw new Error('Product was saved but its identifier was not returned. Media upload could not continue.');
      this.editingId.set(productId);
      const files = this.selectedMediaFiles();
      if (files.length) {
        this.mediaBusy.set(true);
        for (const file of files) {
          this.mediaUploadProgress.set(0);
          const displayOrder = this.existingMedia().length;
          const makePrimary = !this.existingMedia().some((media) => media.is_primary === 1)
            && file.type.startsWith('image/')
            && !files.slice(0, files.indexOf(file)).some((candidate) => candidate.type.startsWith('image/'));
          await this.api.uploadAndLinkProductMedia(tenantId, productId, file, displayOrder, makePrimary, (progress) => this.mediaUploadProgress.set(progress));
          this.selectedMediaFiles.update((remaining) => remaining.filter((candidate) => candidate !== file));
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
    if (!tenantId || !this.canDelete() || !window.confirm(`Delete "${product.product_name}" from this catalogue?`)) return;
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
    if (!tenantId || !this.canDelete() || !window.confirm(`Delete category "${category.category_name}"?`)) return;
    try {
      await this.api.deleteCategory(tenantId, category.id);
      this.categories.set(await this.api.listCategories(tenantId));
      this.notice.set('Category deleted.');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }
}
