import { z } from "zod";

export const editWarehouseSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone number must be at least 10 characters"),
    address: z.string().min(5, "Address is required"),
    photo: z
      .any()
      .refine((file) => !file || file instanceof File, "Invalid image file")
      .optional(),
  });

export type EditWarehouseFormData = z.infer<typeof editWarehouseSchema>;


