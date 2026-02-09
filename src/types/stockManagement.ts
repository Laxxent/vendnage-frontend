// Stock In Types
export interface StockInProduct {
  id: number;
  stock_in_id: number;
  product_id: number;
  quantity: number;
  price?: number;
  expiry_date?: string; // IMPORTANT for FEFO
  batch_number?: string;
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
  user_id?: number;
  date: string;
  notes?: string;
  total_quantity?: number;
  status?: string;
  stock_in_products?: StockInProduct[];
  warehouse?: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CreateStockInPayload {
  warehouse_id: number;
  date: string;
  notes?: string;
  products: StockInProductPayload[];
}

export interface StockInProductPayload {
  product_id: number;
  quantity: number;
  price?: number;
  expiry_date?: string; // IMPORTANT for FEFO
  batch_number?: string;
  notes?: string;
}

export interface UpdateStockInPayload extends CreateStockInPayload {
  id: number;
}

// Stock Transfer Types (Gudang ke Vending Machine)
export interface StockTransferProduct {
  id: number;
  stock_transfer_id: number;
  product_id: number;
  stock_in_id?: number; // Reference to batch used (FEFO/FIFO)
  quantity: number;
  price?: number;
  notes?: string;
  product?: {
    id: number;
    name: string;
    price: number;
    thumbnail: string;
  };
  stock_in?: StockIn;
}

export interface StockTransfer {
  id: number;
  code?: string;
  from_warehouse_id: number;
  to_vending_machine_id: number;
  user_id?: number;
  date: string;
  reference?: string;
  notes?: string;
  total_quantity?: number;
  status?: string;
  stock_transfer_products?: StockTransferProduct[];
  from_warehouse?: {
    id: number;
    name: string;
  };
  to_vending_machine?: {
    id: number;
    name: string;
    location?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CreateStockTransferPayload {
  from_warehouse_id: number;
  to_vending_machine_id: number;
  date: string;
  reference?: string;
  notes?: string;
  status?: "pending" | "completed" | "cancelled";
  products: StockTransferProductPayload[];
}

export interface StockTransferProductPayload {
  product_id: number;
  quantity: number;
  price?: number;
  notes?: string;
  // stock_in_id will be assigned by backend based on FEFO/FIFO
}

export interface UpdateStockTransferPayload extends CreateStockTransferPayload {
  id: number;
}

// Stock Balance Types (for FIFO/FEFO tracking)
export interface StockBalance {
  id: number;
  warehouse_id: number;
  product_id: number;
  stock_in_id: number; // Reference to the stock_in batch
  stock_return_id?: number; // Reference to stock_return batch (if from stock return)
  quantity_remaining: number;
  date_in: string;
  expiry_date?: string; // IMPORTANT for FEFO
  batch_number?: string;
  batch_code?: string; // Direct batch code field (if provided by backend)
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
  stock_in?: StockIn;
  stock_return?: {  // ✅ NEW: Stock return reference for batch code display
    id: number;
    code: string;
    date: string;
  };
  created_at?: string;
  updated_at?: string;
}

// Stock Return Types (mirip Stock In, tanpa price)
export interface StockReturnProduct {
  id?: number;
  stock_return_id?: number;
  product_id: number;
  stock_in_id?: number; // Reference to stock_in batch for tracking
  quantity: number;
  // TIDAK ADA PRICE FIELD
  expiry_date?: string; // IMPORTANT for FEFO
  batch_number?: string;
  notes?: string;
  product?: {
    id: number;
    name: string;
    thumbnail: string;
  };
}

export interface StockReturn {
  id: number;
  code?: string;
  source_type: "warehouse" | "vending_machine";
  from_warehouse_id?: number;
  from_vending_machine_id?: number;
  to_warehouse_id: number;
  user_id?: number;
  date: string;
  notes?: string;
  total_quantity?: number;
  status?: string;
  stock_return_products?: StockReturnProduct[];
  from_warehouse?: {
    id: number;
    name: string;
  };
  from_vending_machine?: {
    id: number;
    name: string;
    location?: string;
  };
  to_warehouse?: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CreateStockReturnPayload {
  source_type: "warehouse" | "vending_machine";
  from_warehouse_id?: number;
  from_vending_machine_id?: number;
  to_warehouse_id: number;
  date: string;
  notes?: string;
  products: StockReturnProductPayload[];
}

export interface StockReturnProductPayload {
  product_id: number;
  quantity: number;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
}

export interface UpdateStockReturnPayload extends CreateStockReturnPayload {
  id: number;
}

// Expiry Alert Types
export interface ExpiryAlert {
  product_id: number;
  product_name: string;
  batch_code: string;
  expiry_date: string;
  days_until_expiry: number;
  quantity: number;
  warehouse_id?: number;
  warehouse_name?: string;
  status: 'expired' | 'expiring_soon' | 'warning';
}
