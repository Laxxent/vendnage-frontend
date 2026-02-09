

export interface Product {
  id: number;
  name: string;
  price: number;
  thumbnail: string;
  about: string;
  brand_id: number;
  category: Category; // Keep for backward compatibility, but use brand_id for new data
  warehouse_stock: number;
  merchant_stock: number;
  pivot?: {
    warehouse_id: number;
    product_id: number;
    stock: number;
    created_at: string;
    updated_at: string;
  };
}

export interface Category {
  id: number;
  name: string;
  tagline: string;
  photo: string;
  products: Product[];
}

// Brand is an alias for Category (using same backend endpoint)
export type Brand = Category;
export type CreateBrandPayload = {
  tagline: string;
  name: string;
  photo: File;
};

export interface CreateCategoryPayload {
  tagline: string;
  name: string;
  photo: File;
}


export interface CreateProductPayload {
  name: string;
  about: string;
  brand_id: number;
  thumbnail: File;
}