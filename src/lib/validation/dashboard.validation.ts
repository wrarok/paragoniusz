import { z } from "zod";

/**
 * Validation schema for dashboard query parameters
 * Validates the optional month parameter in YYYY-MM format
 */
export const dashboardQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format")
    .refine(
      (val) => {
        const [year] = val.split("-").map(Number);
        return year >= 2000 && year <= 2099;
      },
      { message: "Year must be between 2000 and 2099" }
    )
    .nullable()
    .optional(),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
