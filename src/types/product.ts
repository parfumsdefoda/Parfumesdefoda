/**
 * Product type — matches the schema in data/products.json.
 */
export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  shortDescription?: string;
  gender: string;
  categories: string[];
  badge?: string;
  rating?: number;
  featured?: boolean;
  type: "normal" | "niche" | "gold";
  image: string;
  gallery?: string[];
  sizes: ProductSize[];
  stock: number;
  sku?: string;
  barcode?: string;
  tags?: string[];
  notes?: ProductNotes;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductNotes {
  top?: string[];
  middle?: string[];
  base?: string[];
}

export interface ProductSize {
  label: string;
  price: number;
  stock?: number;
}
