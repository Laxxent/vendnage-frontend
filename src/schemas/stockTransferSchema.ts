import { z } from "zod";

export const stockTransferProductSchema = z.object({
  product_id: z.coerce.number().min(1, "Product is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  price: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export const stockTransferSchema = z.object({
  from_warehouse_id: z.coerce.number().min(1, "From Warehouse is required."),
  to_vending_machine_id: z.coerce.number().min(1, "To Vending Machine is required."),
  date: z.string().min(1, "Date is required."),
  reference: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  products: z.array(stockTransferProductSchema).min(1, "At least one product is required."),
});

export type StockTransferFormData = z.infer<typeof stockTransferSchema>;
export type StockTransferProductFormData = z.infer<typeof stockTransferProductSchema>;

