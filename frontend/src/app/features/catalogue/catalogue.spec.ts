import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Catalogue } from './catalogue';
import { CatalogueApiService, CatalogueProduct } from './catalogue-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContextService } from '../../core/workspace/workspace-context.service';

describe('Catalogue Component — Sorting, Media & Visual Parity', () => {
  let component: Catalogue;
  let mockApi: {
    listUnits: ReturnType<typeof vi.fn>;
    listCategories: ReturnType<typeof vi.fn>;
    listProducts: ReturnType<typeof vi.fn>;
    listProductMedia: ReturnType<typeof vi.fn>;
  };
  let mockAuth: {
    restoreSession: ReturnType<typeof vi.fn>;
    errorMessage: ReturnType<typeof vi.fn>;
    accessToken: ReturnType<typeof vi.fn>;
  };
  let mockWorkspace: {
    initialize: ReturnType<typeof vi.fn>;
    activeTenantId: ReturnType<typeof vi.fn>;
    permissions: ReturnType<typeof vi.fn>;
    activeTenant: ReturnType<typeof vi.fn>;
  };

  const sampleProducts: CatalogueProduct[] = [
    {
      id: 1,
      product_code: 'PRD-10',
      product_name: 'Zebra Router',
      description: 'High speed router',
      category_id: 1,
      category_name: 'Networking',
      base_unit_id: 1,
      unit_name: 'Piece',
      unit_symbol: 'pcs',
      brand_name: 'NetCo',
      barcode: '998877',
      cost_price: 150,
      selling_price: 300,
      tax_rate: 18,
      track_inventory: 1,
      is_variant_product: 0,
      publication_status: 'PUBLISHED',
      product_status: 'ACTIVE',
      primary_image_url: 'https://s3.example.com/zebra.jpg',
    },
    {
      id: 2,
      product_code: 'PRD-02',
      product_name: 'alpha switch',
      description: 'Ethernet switch',
      category_id: 1,
      category_name: 'Networking',
      base_unit_id: 1,
      unit_name: 'Piece',
      unit_symbol: 'pcs',
      brand_name: 'SwitchPro',
      barcode: '112233',
      cost_price: 50,
      selling_price: 99.5,
      tax_rate: 18,
      track_inventory: 1,
      is_variant_product: 0,
      publication_status: 'DRAFT',
      product_status: 'ACTIVE',
      primary_image_url: null,
    },
    {
      id: 3,
      product_code: 'PRD-01',
      product_name: 'Beta Modem',
      description: 'DSL modem',
      category_id: 2,
      category_name: 'Hardware',
      base_unit_id: 1,
      unit_name: 'Piece',
      unit_symbol: 'pcs',
      brand_name: null,
      barcode: null,
      cost_price: '80',
      selling_price: '450',
      tax_rate: 18,
      track_inventory: 1,
      is_variant_product: 0,
      publication_status: 'PUBLISHED',
      product_status: 'ACTIVE',
      primary_image_url: 'https://s3.example.com/beta.jpg',
    },
    {
      id: 4,
      product_code: 'PRD-20',
      product_name: 'Alpha Hub',
      description: 'USB hub',
      category_id: 2,
      category_name: 'Hardware',
      base_unit_id: 1,
      unit_name: 'Piece',
      unit_symbol: 'pcs',
      brand_name: 'NetCo',
      barcode: '556677',
      cost_price: 40,
      selling_price: 99.5,
      tax_rate: 18,
      track_inventory: 1,
      is_variant_product: 0,
      publication_status: 'PUBLISHED',
      product_status: 'ACTIVE',
      primary_image_url: 'https://s3.example.com/broken.jpg',
    },
  ];

  beforeEach(async () => {
    mockApi = {
      listUnits: vi.fn().mockResolvedValue([]),
      listCategories: vi.fn().mockResolvedValue([
        {
          id: 1,
          category_name: 'Networking',
          display_order: 1,
          description: null,
          parent_category_id: null,
        },
        {
          id: 2,
          category_name: 'Hardware',
          display_order: 2,
          description: null,
          parent_category_id: null,
        },
      ]),
      listProducts: vi.fn().mockResolvedValue({
        items: [...sampleProducts],
        pagination: { page: 1, page_size: 50, total: 4 },
      }),
      listProductMedia: vi.fn().mockResolvedValue([]),
    };

    mockAuth = {
      restoreSession: vi.fn().mockResolvedValue(true),
      errorMessage: vi.fn((err: unknown) => (err instanceof Error ? err.message : 'Error')),
      accessToken: vi.fn().mockReturnValue('mock-token'),
    };

    mockWorkspace = {
      initialize: vi.fn().mockResolvedValue(undefined),
      activeTenantId: vi.fn().mockReturnValue(100),
      permissions: vi
        .fn()
        .mockReturnValue([
          'TENANT:catalogue.view',
          'TENANT:catalogue.create',
          'TENANT:catalogue.update',
          'TENANT:catalogue.delete',
        ]),
      activeTenant: vi.fn().mockReturnValue({
        active_entitlements: ['catalogue.enabled'],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [Catalogue],
      providers: [
        provideRouter([]),
        { provide: CatalogueApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: WorkspaceContextService, useValue: mockWorkspace },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Catalogue);
    component = fixture.componentInstance;
    component.products.set([...sampleProducts]);
    component.totalProducts.set(sampleProducts.length);
  });

  it('creates the component successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('Product Media and Image Fallbacks', () => {
    it('generates monogram initials correctly for products', () => {
      expect(component.getInitials('Zebra Router')).toBe('ZR');
      expect(component.getInitials('alpha switch')).toBe('AS');
      expect(component.getInitials('Singleword')).toBe('SI');
      expect(component.getInitials('')).toBe('•');
    });

    it('tracks image loading failures and marks image as failed', () => {
      expect(component.failedImages().has(4)).toBe(false);
      component.handleImageError(4);
      expect(component.failedImages().has(4)).toBe(true);
    });
  });

  describe('Client-Side Sorting', () => {
    it('cycles sort direction: unsorted -> asc -> desc -> unsorted', () => {
      expect(component.sortColumn()).toBeNull();
      expect(component.sortDirection()).toBeNull();

      // Click 1: asc
      component.toggleSort('product_name');
      expect(component.sortColumn()).toBe('product_name');
      expect(component.sortDirection()).toBe('asc');
      expect(component.getAriaSort('product_name')).toBe('ascending');

      // Click 2: desc
      component.toggleSort('product_name');
      expect(component.sortColumn()).toBe('product_name');
      expect(component.sortDirection()).toBe('desc');
      expect(component.getAriaSort('product_name')).toBe('descending');

      // Click 3: unsorted
      component.toggleSort('product_name');
      expect(component.sortColumn()).toBeNull();
      expect(component.sortDirection()).toBeNull();
      expect(component.getAriaSort('product_name')).toBe('none');
    });

    it('NEVER calls the API when changing sort column or direction', () => {
      mockApi.listProducts.mockClear();

      component.toggleSort('product_name');
      component.toggleSort('product_name');
      component.toggleSort('product_name');
      component.toggleSort('selling_price');
      component.toggleSort('category_name');

      expect(mockApi.listProducts).not.toHaveBeenCalled();
    });

    it('sorts product_name ascending and descending case-insensitively', () => {
      component.toggleSort('product_name'); // asc
      expect(component.sortedProducts().map((p) => p.product_name)).toEqual([
        'Alpha Hub',
        'alpha switch',
        'Beta Modem',
        'Zebra Router',
      ]);

      component.toggleSort('product_name'); // desc
      expect(component.sortedProducts().map((p) => p.product_name)).toEqual([
        'Zebra Router',
        'Beta Modem',
        'alpha switch',
        'Alpha Hub',
      ]);
    });

    it('sorts product_code ascending and descending with natural alphanumerics', () => {
      component.toggleSort('product_code'); // asc
      expect(component.sortedProducts().map((p) => p.product_code)).toEqual([
        'PRD-01',
        'PRD-02',
        'PRD-10',
        'PRD-20',
      ]);

      component.toggleSort('product_code'); // desc
      expect(component.sortedProducts().map((p) => p.product_code)).toEqual([
        'PRD-20',
        'PRD-10',
        'PRD-02',
        'PRD-01',
      ]);
    });

    it('sorts selling_price numerically rather than lexicographically', () => {
      component.toggleSort('selling_price'); // asc
      expect(component.sortedProducts().map((p) => Number(p.selling_price))).toEqual([
        99.5, 99.5, 300, 450,
      ]);

      component.toggleSort('selling_price'); // desc
      expect(component.sortedProducts().map((p) => Number(p.selling_price))).toEqual([
        450, 300, 99.5, 99.5,
      ]);
    });

    it('sorts cost_price numerically', () => {
      component.toggleSort('cost_price'); // asc
      expect(component.sortedProducts().map((p) => Number(p.cost_price))).toEqual([
        40, 50, 80, 150,
      ]);
    });

    it('sorts category_name and handles missing/equal categories stably', () => {
      component.toggleSort('category_name'); // asc
      expect(component.sortedProducts().map((p) => p.category_name)).toEqual([
        'Hardware',
        'Hardware',
        'Networking',
        'Networking',
      ]);
    });

    it('sorts publication_status', () => {
      component.toggleSort('publication_status'); // asc
      expect(component.sortedProducts().map((p) => p.publication_status)).toEqual([
        'DRAFT',
        'PUBLISHED',
        'PUBLISHED',
        'PUBLISHED',
      ]);
    });

    it('restores original loaded order when sorting is cleared', () => {
      component.toggleSort('product_name'); // asc
      component.toggleSort('product_name'); // desc
      component.toggleSort('product_name'); // null (cleared)

      expect(component.sortedProducts()).toEqual(sampleProducts);
    });
  });

  describe('Filtering and Pagination Combined with Sorting', () => {
    it('applies category filter before sorting and pagination', () => {
      component.toggleCategoryFilter(1); // Networking only (id 1 and id 2)
      component.toggleSort('product_name'); // asc

      expect(component.sortedProducts().map((p) => p.product_name)).toEqual([
        'alpha switch',
        'Zebra Router',
      ]);
    });

    it('applies publication status filter before sorting', () => {
      component.filterStatus.set('PUBLISHED');
      component.toggleSort('selling_price'); // asc

      const results = component.sortedProducts();
      expect(results.length).toBe(3);
      expect(results.every((p) => p.publication_status === 'PUBLISHED')).toBe(true);
      expect(results.map((p) => Number(p.selling_price))).toEqual([99.5, 300, 450]);
    });

    it('renders correct paged slice after sorting', () => {
      component.pageSize.set(2);
      component.currentPage.set(1);
      component.toggleSort('product_name'); // asc: Alpha Hub, alpha switch, Beta Modem, Zebra Router

      expect(component.pagedProducts().map((p) => p.product_name)).toEqual([
        'Alpha Hub',
        'alpha switch',
      ]);

      component.currentPage.set(2);
      expect(component.pagedProducts().map((p) => p.product_name)).toEqual([
        'Beta Modem',
        'Zebra Router',
      ]);
    });

    it('preserves sorting when switching between Table and Grid views', () => {
      component.setViewMode('table');
      component.toggleSort('selling_price');
      expect(component.viewMode()).toBe('table');
      const tableOrder = component.pagedProducts().map((p) => p.id);

      component.setViewMode('grid');
      expect(component.viewMode()).toBe('grid');
      const gridOrder = component.pagedProducts().map((p) => p.id);

      expect(gridOrder).toEqual(tableOrder);
    });

    it('retains sorting when toggling column visibility', () => {
      component.toggleSort('product_name');
      const before = component.sortedProducts().map((p) => p.product_name);

      component.toggleColumn('price');
      expect(component.isColumnVisible('price')).toBe(false);

      const after = component.sortedProducts().map((p) => p.product_name);
      expect(after).toEqual(before);
    });
  });
});
