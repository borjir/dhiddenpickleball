import { z } from "zod";

/**
 * Profile editing is limited to the fields a player owns. Email is the
 * sign-in identity and role is a club-controlled column, so neither is in
 * this form. The database column grants are the final guard.
 */
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "Keep your name under 100 characters."),
  phone: z
    .string()
    .trim()
    .max(30, "Keep the number under 30 characters.")
    .refine((value) => {
      if (!value) return true;
      if (!/^[+()\d\s-]+$/.test(value)) return false;
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Enter a valid mobile number, using digits, spaces, +, -, or parentheses."),
});

export type ProfileValues = z.infer<typeof profileSchema>;

/** First message per field, ready for the inline form errors. */
export function profileFieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}
