export interface StockInProduct {
  id: number;
  stock_in_id: number;
  product_id: number;
  quantity: number;
  price?: number;
  notes?: string;
  product?: {
    id: number;
    name: string;
    price: number;
    thumbnail: string;
  };
}

export interface StockIn {
  id: number;
  code?: string;
  warehouse_id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
    price: number;
    thumbnail: string;
  };
  warehouse?: {
    id: number;
    name: string;
  };
  stock_in_products?: StockInProduct[];
  date?: string; // Backend uses 'date' field
  date_in: string; // Normalized from 'date' or 'date_in'
  date_out: string; // May not exist in backend
  brand_name: string; // May not exist in backend, might be in notes
  notes?: string;
  status?: string;
  total_quantity?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateStockInPayload {
  product_id: number;
  date_in: string;
  date_out: string;
  brand_name: string;
  warehouse_id?: number;
}

export interface UpdateStockInPayload extends CreateStockInPayload {
  id: number;
}


