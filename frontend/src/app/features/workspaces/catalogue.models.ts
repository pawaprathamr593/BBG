export interface CatalogueUnit {
  id: number;
  unit_code: string;
  unit_name: string;
  unit_symbol: string;
  quantity_precision: number;
  is_fraction_allowed: number | boolean;
}

export interface CatalogueCategory {
  id: number;
  parent_category_id: number | null;
  category_name: string;
  description: string | null;
  display_order: number;
}

export interface CatalogueProduct {
  id: number;
  product_code: string;
  product_name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  base_unit_id: number;
  unit_name: string;
  unit_symbol: string;
  brand_name: string | null;
  barcode: string | null;
  cost_price: string | number;
  selling_price: string | number;
  tax_rate: string | number;
  track_inventory: number | boolean;
  is_variant_product: number | boolean;
  publication_status: 'DRAFT' | 'PUBLISHED' | string;
  product_status: string;
}

export interface CataloguePage<T> {
  items: T[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
  };
}

export interface ProductPayload {
  product_code: string;
  product_name: string;
  description: string;
  category_id: number | null;
  base_unit_id: number;
  brand_name: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  publication_status: 'DRAFT' | 'PUBLISHED';
}

export interface CategoryPayload {
  category_name: string;
  description: string;
  parent_category_id: number | null;
  display_order: number;
}
