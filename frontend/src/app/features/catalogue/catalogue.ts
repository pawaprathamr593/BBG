import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';
import { CatalogueApiService, CatalogueCategory, CatalogueProduct, CatalogueUnit } from './catalogue-api.service';

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
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="catalogue-page">
      <header class="page-header">
        <div>
          <a class="back-link" routerLink="/dashboard">← Workspace dashboard</a>
          <p class="eyebrow">BUSINESS WORKSPACE / CATALOGUE</p>
          <h1>Product catalogue</h1>
          <p class="subtitle">Manage your business products and categories in one place.</p>
        </div>
        <button class="primary-button" type="button" [disabled]="!canManage() || !units().length" (click)="openCreate()">＋ Add product</button>
      </header>

      @if (loading()) {
        <section class="state-panel" role="status"><span class="spinner"></span><div><strong>Loading catalogue</strong><p>Fetching products, categories and units for this workspace.</p></div></section>
      } @else if (error()) {
        <section class="state-panel error" role="alert"><strong>Catalogue unavailable</strong><p>{{ error() }}</p><button type="button" class="secondary-button" (click)="load()">Try again</button></section>
      } @else if (!tenantId()) {
        <section class="state-panel"><strong>Select a business workspace first</strong><p>Catalogue data is tenant-specific. Return to your dashboard and select the business workspace you want to manage.</p><a routerLink="/dashboard" class="text-link">Choose workspace →</a></section>
      } @else if (!hasPermission()) {
        <section class="state-panel"><strong>You don't have catalogue access</strong><p>This workspace has not granted you the CATALOGUE_MANAGE permission.</p><a routerLink="/dashboard" class="text-link">Return to dashboard →</a></section>
      } @else if (!hasProductEntitlement()) {
        <section class="state-panel"><strong>Product management isn't included in this plan</strong><p>Your current active subscription does not include the PRODUCT_MANAGEMENT entitlement. Upgrade the business plan to manage products.</p><a routerLink="/dashboard" class="text-link">Return to dashboard →</a></section>
      } @else {
        <section class="stats-row" aria-label="Catalogue summary">
          <article><span>Active products</span><strong>{{ totalProducts() }}</strong></article>
          <article><span>Categories</span><strong>{{ categories().length }}</strong></article>
          <article><span>Units available</span><strong>{{ units().length }}</strong></article>
        </section>

        <section class="catalogue-layout">
          <div class="products-panel">
            <div class="panel-heading">
              <div><h2>Products</h2><p>Search and maintain your product listings.</p></div>
              <span class="count-pill">{{ products().length }} shown</span>
            </div>
            <div class="toolbar">
              <label class="search-box"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search by product name or code" [ngModel]="search()" (ngModelChange)="search.set($event)" (keyup.enter)="loadProducts()"></label>
              <button type="button" class="secondary-button" (click)="loadProducts()">Search</button>
            </div>

            @if (productsLoading()) {
              <div class="inline-state">Loading products…</div>
            } @else if (!products().length) {
              <div class="empty-state"><span>▦</span><strong>No products found</strong><p>Add your first product or adjust the search term.</p><button class="primary-button" type="button" (click)="openCreate()">Add product</button></div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Status</th><th class="actions-heading">Actions</th></tr></thead>
                  <tbody>
                    @for (product of products(); track product.id) {
                      <tr>
                        <td><strong>{{ product.product_name }}</strong><small>{{ product.product_code }}@if (product.brand_name) { · {{ product.brand_name }} }</small></td>
                        <td>{{ product.category_name || 'Uncategorised' }}</td>
                        <td>{{ product.selling_price | number:'1.2-2' }} <small>{{ product.unit_symbol || '' }}</small></td>
                        <td><span class="status" [class.published]="product.publication_status === 'PUBLISHED'">{{ product.publication_status }}</span></td>
                        <td class="actions"><button type="button" (click)="edit(product)">Edit</button><button type="button" class="danger-link" (click)="removeProduct(product)">Delete</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="table-footer"><span>{{ totalProducts() }} products in this workspace</span><button type="button" class="secondary-button" (click)="loadProducts()">Refresh</button></div>
            }
          </div>

          <aside class="categories-panel">
            <div class="panel-heading"><div><h2>Categories</h2><p>Organise your catalogue.</p></div></div>
            <form class="category-form" (ngSubmit)="addCategory()">
              <label>Category name<input name="categoryName" [(ngModel)]="categoryName" maxlength="120" required placeholder="e.g. Office furniture"></label>
              <label>Description <span class="optional">(optional)</span><input name="categoryDescription" [(ngModel)]="categoryDescription" maxlength="500" placeholder="Short description"></label>
              <button class="secondary-button full-width" type="submit" [disabled]="savingCategory() || !categoryName.trim()"> {{ savingCategory() ? 'Adding…' : 'Add category' }} </button>
            </form>
            <ul class="category-list">
              @for (category of categories(); track category.id) {
                <li><div><strong>{{ category.category_name }}</strong><small>{{ category.description || 'No description' }}</small></div><button type="button" class="icon-button" [attr.aria-label]="'Delete ' + category.category_name" (click)="removeCategory(category)">×</button></li>
              } @empty { <li class="category-empty">No categories created yet.</li> }
            </ul>
          </aside>
        </section>
      }

      @if (showForm()) {
        <div class="modal-backdrop" (click)="closeForm()">
          <section class="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" (click)="$event.stopPropagation()">
            <header><div><p class="eyebrow">{{ editingId() ? 'UPDATE LISTING' : 'NEW LISTING' }}</p><h2 id="product-modal-title">{{ editingId() ? 'Edit product' : 'Add product' }}</h2></div><button type="button" class="icon-button close-button" aria-label="Close" (click)="closeForm()">×</button></header>
            <form (ngSubmit)="saveProduct()">
              <div class="form-grid">
                <label>Product code<input name="productCode" [(ngModel)]="form.product_code" maxlength="80" required></label>
                <label>Product name<input name="productName" [(ngModel)]="form.product_name" maxlength="180" required></label>
                <label>Category<select name="category" [(ngModel)]="form.category_id"><option [ngValue]="null">Uncategorised</option>@for (category of categories(); track category.id) { <option [ngValue]="category.id">{{ category.category_name }}</option> }</select></label>
                <label>Base unit<select name="unit" [(ngModel)]="form.base_unit_id" required><option [ngValue]="null">Select unit</option>@for (unit of units(); track unit.id) { <option [ngValue]="unit.id">{{ unit.unit_name }} ({{ unit.unit_symbol }})</option> }</select></label>
                <label>Brand<input name="brand" [(ngModel)]="form.brand_name" maxlength="120"></label>
                <label>Barcode<input name="barcode" [(ngModel)]="form.barcode" maxlength="100"></label>
                <label>Cost price<input type="number" name="cost" [(ngModel)]="form.cost_price" min="0" step="0.01"></label>
                <label>Selling price<input type="number" name="selling" [(ngModel)]="form.selling_price" min="0" step="0.01"></label>
                <label>Tax rate (%)<input type="number" name="tax" [(ngModel)]="form.tax_rate" min="0" max="100" step="0.01"></label>
                @if (editingId()) { <label>Publication status<select name="publication" [(ngModel)]="form.publication_status"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label> }
                <label class="span-two">Description<textarea name="description" [(ngModel)]="form.description" maxlength="5000" rows="3"></textarea></label>
              </div>
              <p class="form-note">New products are saved as drafts. Publishing and product limits are validated by BBG based on your active subscription.</p>
              @if (formError()) { <p class="form-error" role="alert">{{ formError() }}</p> }
              <footer><button type="button" class="secondary-button" (click)="closeForm()">Cancel</button><button type="submit" class="primary-button" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save product' }}</button></footer>
            </form>
          </section>
        </div>
      }
      @if (notice()) { <div class="toast" role="status">{{ notice() }}</div> }
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100%;background:var(--surface-page);color:var(--text-primary)}
    .catalogue-page{width:min(1440px,100%);margin:0 auto;padding:38px 32px 72px}
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
    .table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th{padding:11px 9px;color:var(--text-secondary);font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)}td{padding:14px 9px;border-bottom:1px solid var(--border);font-size:.8rem}td strong,td small{display:block}td small{margin-top:4px;color:var(--text-secondary);font-size:.7rem}.actions-heading{text-align:right}.actions{text-align:right}.actions button{border:0;background:transparent;color:var(--brand);font:inherit;font-size:.76rem;font-weight:700;cursor:pointer;margin-left:9px}.actions .danger-link{color:#c44747}.status.published{color:#137a51;background:#e7f6ee}
    .table-footer{display:flex;justify-content:space-between;align-items:center;padding-top:14px;color:var(--text-secondary);font-size:.75rem}.inline-state,.empty-state{padding:42px 12px;text-align:center;color:var(--text-secondary)}.empty-state{display:grid;justify-items:center;gap:9px}.empty-state>span{font-size:2rem}.empty-state strong{color:var(--text-primary)}.empty-state p{margin:0 0 8px;font-size:.82rem}
    .category-form{display:grid;gap:12px;margin:18px 0}.category-form label,.form-grid label{display:grid;gap:6px;font-size:.75rem;font-weight:700}.category-form input,.form-grid input,.form-grid select,.form-grid textarea{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid var(--border);border-radius:8px;background:var(--surface-page);color:var(--text-primary);font:inherit;font-size:.8rem}.optional{color:var(--text-secondary);font-weight:400}.full-width{width:100%}.category-list{list-style:none;margin:0;padding:0}.category-list li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 0;border-top:1px solid var(--border)}.category-list strong,.category-list small{display:block}.category-list strong{font-size:.8rem}.category-list small{margin-top:4px;color:var(--text-secondary);font-size:.7rem}.category-empty{color:var(--text-secondary);font-size:.78rem}
    .icon-button{border:0;background:transparent;color:var(--text-secondary);font-size:1.25rem;cursor:pointer}.modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:rgba(12,20,16,.58)}.product-modal{width:min(720px,100%);max-height:min(90vh,900px);overflow:auto;padding:24px;background:var(--surface-card);border:1px solid var(--border);border-radius:17px;box-shadow:0 24px 80px rgba(0,0,0,.22)}.product-modal>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.product-modal header .eyebrow{margin:0 0 6px}.product-modal h2{margin:0;font-size:1.35rem}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.form-grid .span-two{grid-column:1/-1}.form-note{margin:14px 0;color:var(--text-secondary);font-size:.75rem;line-height:1.5}.form-error{color:#bd3535;font-size:.8rem}.product-modal footer{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.toast{position:fixed;right:22px;bottom:22px;z-index:1100;padding:13px 17px;background:var(--surface-card);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.15);font-size:.82rem}
    @media(max-width:900px){.catalogue-layout{grid-template-columns:1fr}.categories-panel{order:-1}}
    @media(max-width:600px){.catalogue-page{padding:26px 16px 56px}.page-header{align-items:flex-start;flex-direction:column}.stats-row{gap:8px}.stats-row article{padding:13px}.stats-row span{font-size:.68rem}.stats-row strong{font-size:1.35rem}.products-panel,.categories-panel{padding:15px}.form-grid{grid-template-columns:1fr}.form-grid .span-two{grid-column:auto}.toolbar{align-items:stretch}.table-footer{gap:10px;flex-wrap:wrap}}
  `],
})
export class Catalogue implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly api = inject(CatalogueApiService);

  readonly tenantId = this.workspace.activeTenantId;
  readonly permissions = this.workspace.permissions;
  readonly hasPermission = computed(() => this.permissions().some((permission) =>
    permission.scope_type === 'TENANT' && permission.permission_code === 'CATALOGUE_MANAGE'));
  readonly hasProductEntitlement = computed(() => {
    const entitlements = this.workspace.activeTenant()?.active_entitlements ?? '';
    return entitlements.split(';').some((entry) => {
      const [code, value] = entry.split('=');
      return code === 'PRODUCT_MANAGEMENT' && ['1', 'TRUE', 'YES'].includes((value ?? '').toUpperCase());
    });
  });
  readonly canManage = computed(() => this.hasPermission() && this.hasProductEntitlement());
  readonly loading = signal(true);
  readonly productsLoading = signal(false);
  readonly saving = signal(false);
  readonly savingCategory = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly notice = signal('');
  readonly products = signal<CatalogueProduct[]>([]);
  readonly categories = signal<CatalogueCategory[]>([]);
  readonly units = signal<CatalogueUnit[]>([]);
  readonly totalProducts = signal(0);
  readonly search = signal('');
  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
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
      await this.load();
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
    this.editingId.set(null);
    this.form = emptyProduct();
    this.formError.set('');
    this.showForm.set(true);
  }

  edit(product: CatalogueProduct): void {
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
    this.showForm.set(true);
  }

  closeForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
    this.formError.set('');
  }

  async saveProduct(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId || !this.canManage() || !this.form.base_unit_id) {
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
      const editingId = this.editingId();
      if (editingId) await this.api.updateProduct(tenantId, editingId, payload);
      else await this.api.createProduct(tenantId, payload);
      this.showForm.set(false);
      this.notice.set(editingId ? 'Product updated.' : 'Product created as a draft.');
      await this.loadProducts();
    } catch (error) {
      this.formError.set(this.auth.errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  async removeProduct(product: CatalogueProduct): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId || !this.canManage() || !window.confirm(`Delete "${product.product_name}" from this catalogue?`)) return;
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
    if (!tenantId || !this.canManage() || !name) return;
    this.savingCategory.set(true);
    this.error.set('');
    try {
      await this.api.createCategory(tenantId, name, this.categoryDescription.trim());
      this.categoryName = '';
      this.categoryDescription = '';
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
    if (!tenantId || !this.canManage() || !window.confirm(`Delete category "${category.category_name}"?`)) return;
    try {
      await this.api.deleteCategory(tenantId, category.id);
      this.categories.set(await this.api.listCategories(tenantId));
      this.notice.set('Category deleted.');
    } catch (error) {
      this.error.set(this.auth.errorMessage(error));
    }
  }
}
