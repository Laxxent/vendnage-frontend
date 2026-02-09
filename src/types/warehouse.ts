import { Product } from "./product";

export interface Warehouse {
  id: number;
  name: string;
  address: string;
  phone: string;
  photo: string;
  products: Product[];
}

export interface CreateWarehousePayload {
  name: string;
  address: string;
  phone: string;
  photo?: File | null;
}