import { z } from "zod";

// Schema for editing an existing user: photo and password are optional
export const editUserSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters."),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits.")
      .max(15, "Phone number is too long."),
    email: z.string().email("Invalid email format."),
    role: z.string().optional(), // ✅ Role field for updating user role
    password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal("").transform(() => undefined)),
    password_confirmation: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    photo: z
      .any()
      .refine((file) => !file || file instanceof File, "Invalid file")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.password || data.password_confirmation) {
        return data.password === data.password_confirmation;
      }
      return true;
    },
    {
      message: "Passwords must match.",
      path: ["password_confirmation"],
    }
  );

export type EditUserFormData = z.infer<typeof editUserSchema>;


