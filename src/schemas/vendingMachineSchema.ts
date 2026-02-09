import { z } from "zod";

export const vendingMachineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  status: z.string().optional(),
  assigned_user_id: z.number({
    required_error: "Please assign a PIC",
    invalid_type_error: "Please select a valid PIC",
  }).min(1, "Please assign a PIC"),
});

export type VendingMachineFormData = z.infer<typeof vendingMachineSchema>;

export const editVendingMachineSchema = vendingMachineSchema;

export type EditVendingMachineFormData = z.infer<typeof editVendingMachineSchema>;

