export interface VendingMachine {
  id: number;
  name: string;
  location?: string;
  status?: string;
  assigned_user_id?: number; // User ID yang di-assign (PIC)
  assigned_user?: { // User object yang di-assign (optional, untuk display)
    id: number;
    name: string;
    email: string;
    roles?: string[]; // Roles dari user yang di-assign
  };
  created_at?: string;
  updated_at?: string;
}

export interface VendingMachineStock {
  id: number;
  vending_machine_id: number;
  product_id: number;
  stock_in_id: number; // Reference to the batch used
  quantity: number;
  expiry_date?: string;
  date_transferred?: string;
  product?: {
    id: number;
    name: string;
    price: number;
    thumbnail: string;
  };
  vending_machine?: {
    id: number;
    name: string;
    location?: string;
  };
  stock_in?: {
    id: number;
    code: string;
    date: string;
    stock_in_products?: any[];
  };
  created_at?: string;
  updated_at?: string;
}

