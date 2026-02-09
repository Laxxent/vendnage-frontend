import { z } from "zod";

export const editProductSchema = z.object({
  name: z.string().min(1, "Product name is required."), // ✅ Only require non-empty, no minimum length
  about: z.string(), // ✅ No minimum length requirement, can be empty
  brand_id: z.coerce.number().min(1, "Brand is required."),
  thumbnail: z
    .any()
    .refine((file) => !file || file instanceof File, "Invalid image file")
    .refine(
      (file) => !file || (file instanceof File && file.size <= 2048 * 1024),
      "Image size must be under 2048 KB (2 MB)."
    )
    .optional(),
});

export type EditProductFormData = z.infer<typeof editProductSchema>;

