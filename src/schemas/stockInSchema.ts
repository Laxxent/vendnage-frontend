import { z } from "zod";

export const stockInProductSchema = z.object({
  product_id: z.coerce.number().min(1, "Product is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  price: z.coerce.number().min(0.01, "Price is required and must be greater than 0."),
  expiry_date: z.string().min(1, "Expiry date is required for FEFO tracking."), // Required for FEFO tracking
  batch_number: z.string().optional(),
  notes: z.string().optional(),
});

export const stockInSchema = z.object({
  warehouse_id: z.coerce.number().min(1, "Warehouse is required."),
  date: z.string().min(1, "Date is required."),
  notes: z.string().optional(),
  products: z.array(stockInProductSchema).min(1, "At least one product is required."),
});

export type StockInFormData = z.infer<typeof stockInSchema>;
export type StockInProductFormData = z.infer<typeof stockInProductSchema>;
