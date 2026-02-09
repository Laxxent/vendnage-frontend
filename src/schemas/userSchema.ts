import { z } from "zod";

export const userSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters."),
    phone: z.string().min(10, "Phone number must be at least 10 digits.").max(15, "Phone number is too long."),
    email: z.string().email("Invalid email format."),
    role: z.string().min(1, "Role is required.").optional(), // Made optional - will be assigned via Assign Role page
    password: z.string().min(6, "Password must be at least 6 characters."),
    password_confirmation: z.string().min(6, "Password must be at least 6 characters."),
    photo: z
      .any()
      .refine((file) => !file || file instanceof File, "Invalid file")
      .optional(),
  })
  .refine((data) => !data.password || data.password === data.password_confirmation, {
    message: "Passwords must match.",
    path: ["password_confirmation"],
  });
 

export type UserFormData = z.infer<typeof userSchema>;
