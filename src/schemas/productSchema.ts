import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required."), // ✅ Only require non-empty, no minimum length
  about: z.string(), // ✅ No minimum length requirement, can be empty
  brand_id: z.coerce.number().min(1, "Brand is required."),
  thumbnail: z
    .custom<File>((file) => file instanceof File, "Thumbnail is required")
    .refine((file) => ["image/png", "image/jpeg", "image/gif"].includes(file.type), {
      message: "Invalid image format. Use PNG, JPEG, or GIF.",
    })
    .refine((file) => file.size <= 2 * 1024 * 1024, {
      message: "Image size must be under 2MB.",
    }),
    
});

export type ProductFormData = z.infer<typeof productSchema>;
