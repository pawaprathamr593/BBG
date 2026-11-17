import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../core/http/api-error';
import { CatalogueApiService } from './catalogue-api.service';
import { CatalogueCategory, CatalogueProduct, CatalogueUnit, CategoryPayload, ProductPayload } from './catalogue.models';
import { WorkspaceContextService } from './workspace-context.service';

@Component({
  selector: 'app-catalogue-workspace',
  imports: [FormsModule],
  templateUrl: './catalogue-workspace.html',
  styleUrl: './catalogue-workspace.scss',
})
export class CatalogueWorkspace implements OnInit {
  private readonly api = inject(CatalogueApiService);
  private readonly workspace = inject(WorkspaceContextService);
  protected readonly tenantId = this.workspace.tenantId;
  protected readonly products = signal<CatalogueProduct[]>([]);
  protected readonly categories = signal<CatalogueCategory[]>([]);
  protected readonly units = signal<CatalogueUnit[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = 20;
  protected readonly total = signal(0);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  protected readonly showProductForm = signal(false);
  protected readonly showCategoryForm = signal(false);
  protected readonly editingProductId = signal<number | null>(null);
  protected readonly editingCategoryId = signal<number | null>(null);

  protected productForm: ProductPayload = this.emptyProduct();
  protected categoryForm: CategoryPayload = this.emptyCategory();

  ngOnInit(): void {
    void this.loadAll();
  }

  protected async loadAll(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const [productPage, categoryResult, unitResult] = await Promise.all([
        this.api.listProducts(tenantId, this.page(), this.pageSize, this.search()),
        this.api.listCategories(tenantId),
        this.api.listUnits(),
      ]);
      this.products.set(productPage.items ?? []);
      this.total.set(productPage.pagination?.total ?? productPage.items?.length ?? 0);
      this.categories.set(categoryResult.items ?? []);
      this.units.set(unitResult.items ?? []);
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to load catalogue data.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async searchProducts(): Promise<void> {
    this.page.set(1);
    await this.loadAll();
  }

  protected async changePage(delta: number): Promise<void> {
    const next = this.page() + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
    await this.loadAll();
  }

  protected openCreateProduct(): void {
    this.editingProductId.set(null);
    this.productForm = this.emptyProduct();
    this.showProductForm.set(true);
    this.error.set('');
  }

  protected async editProduct(product: CatalogueProduct): Promise<void> {
    this.editingProductId.set(product.id);
    this.productForm = {
      product_code: product.product_code,
      product_name: product.product_name,
      description: product.description ?? '',
      category_id: product.category_id,
      base_unit_id: product.base_unit_id,
      brand_name: product.brand_name ?? '',
      barcode: product.barcode ?? '',
      cost_price: Number(product.cost_price ?? 0),
      selling_price: Number(product.selling_price ?? 0),
      tax_rate: Number(product.tax_rate ?? 0),
      publication_status: product.publication_status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    };
    this.showProductForm.set(true);
    this.error.set('');
  }

  protected closeProductForm(): void {
    this.showProductForm.set(false);
    this.editingProductId.set(null);
  }

  protected async saveProduct(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId) return;
    if (!this.productForm.product_code.trim() || !this.productForm.product_name.trim() || !this.productForm.base_unit_id) {
      this.error.set('Product code, product name and unit are required.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const productId = this.editingProductId();
      if (productId) {
        await this.api.updateProduct(tenantId, productId, this.productForm);
        this.notice.set('Product updated.');
      } else {
        await this.api.createProduct(tenantId, this.productForm);
        this.notice.set('Product created.');
      }
      this.closeProductForm();
      await this.loadAll();
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to save product.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeProduct(product: CatalogueProduct): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId || !window.confirm(`Move “${product.product_name}” to the deleted state?`)) return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.deleteProduct(tenantId, product.id);
      this.notice.set('Product moved to the deleted state.');
      await this.loadAll();
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to delete product.');
    } finally {
      this.saving.set(false);
    }
  }

  protected openCreateCategory(): void {
    this.editingCategoryId.set(null);
    this.categoryForm = this.emptyCategory();
    this.showCategoryForm.set(true);
    this.error.set('');
  }

  protected editCategory(category: CatalogueCategory): void {
    this.editingCategoryId.set(category.id);
    this.categoryForm = {
      category_name: category.category_name,
      description: category.description ?? '',
      parent_category_id: category.parent_category_id,
      display_order: category.display_order,
    };
    this.showCategoryForm.set(true);
  }

  protected closeCategoryForm(): void {
    this.showCategoryForm.set(false);
    this.editingCategoryId.set(null);
  }

  protected async saveCategory(): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId || !this.categoryForm.category_name.trim()) {
      this.error.set('Category name is required.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const categoryId = this.editingCategoryId();
      if (categoryId) {
        await this.api.updateCategory(tenantId, categoryId, this.categoryForm);
        this.notice.set('Category updated.');
      } else {
        await this.api.createCategory(tenantId, this.categoryForm);
        this.notice.set('Category created.');
      }
      this.closeCategoryForm();
      await this.loadAll();
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to save category.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeCategory(category: CatalogueCategory): Promise<void> {
    const tenantId = this.tenantId();
    if (!tenantId || !window.confirm(`Delete category “${category.category_name}”?`)) return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.deleteCategory(tenantId, category.id);
      this.notice.set('Category deleted.');
      await this.loadAll();
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to delete category.');
    } finally {
      this.saving.set(false);
    }
  }

  protected categoryName(categoryId: number | null): string {
    return this.categories().find((category) => category.id === categoryId)?.category_name ?? 'Uncategorised';
  }

  private emptyProduct(): ProductPayload {
    return {
      product_code: '', product_name: '', description: '', category_id: null, base_unit_id: 0,
      brand_name: '', barcode: '', cost_price: 0, selling_price: 0, tax_rate: 0, publication_status: 'DRAFT',
    };
  }

  private emptyCategory(): CategoryPayload {
    return { category_name: '', description: '', parent_category_id: null, display_order: 0 };
  }
}
