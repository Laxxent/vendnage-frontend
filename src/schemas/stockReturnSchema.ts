import { z } from "zod";

export const stockReturnProductSchema = z.object({
  product_id: z.coerce.number().min(1, "Product is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  // TIDAK ADA PRICE FIELD
  expiry_date: z.string().min(1, "Expiry date is required for FEFO tracking."), // Required for FEFO tracking
  batch_number: z.string().optional(),
  notes: z.string().optional(),
});

export const stockReturnSchema = z.object({
  source_type: z.enum(["warehouse", "vending_machine"], {
    required_error: "Source type is required.",
    invalid_type_error: "Source type must be either 'warehouse' or 'vending_machine'.",
  }),
  from_warehouse_id: z.coerce.number().optional(),
  from_vending_machine_id: z.coerce.number().optional(),
  to_warehouse_id: z.coerce.number().min(1, "To warehouse is required."),
  date: z.string().min(1, "Date is required."),
  notes: z.string().optional(),
  products: z.array(stockReturnProductSchema).min(1, "At least one product is required."),
}).refine(
  (data) => {
    if (data.source_type === "warehouse") {
      return data.from_warehouse_id && data.from_warehouse_id > 0;
    } else if (data.source_type === "vending_machine") {
      return data.from_vending_machine_id && data.from_vending_machine_id > 0;
    }
    return false;
  },
  {
    message: "Source field is required based on source type.",
    path: ["from_warehouse_id"], // Will be dynamically set in refine
  }
).refine(
  (data) => {
    if (data.source_type === "warehouse") {
      return data.from_warehouse_id && data.from_warehouse_id > 0;
    }
    return true;
  },
  {
    message: "From warehouse is required when source type is warehouse.",
    path: ["from_warehouse_id"],
  }
).refine(
  (data) => {
    if (data.source_type === "vending_machine") {
      return data.from_vending_machine_id && data.from_vending_machine_id > 0;
    }
    return true;
  },
  {
    message: "From vending machine is required when source type is vending machine.",
    path: ["from_vending_machine_id"],
  }
);

export type StockReturnFormData = z.infer<typeof stockReturnSchema>;
export type StockReturnProductFormData = z.infer<typeof stockReturnProductSchema>;





