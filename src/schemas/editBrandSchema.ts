import { z } from "zod";

export const editBrandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tagline: z.string().min(1, "Tagline is required"),
  photo: z
    .any()
    .refine((file) => !file || file instanceof File, "Invalid image file")
    .optional(),
});

export type EditBrandFormData = z.infer<typeof editBrandSchema>;

