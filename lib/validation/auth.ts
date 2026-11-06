import { z } from "zod";

/**
 * Auth form schemas. The client answer confirmed email verification only, so
 * the password rule here is a working minimum (8–72 characters), not a
 * client-approved policy. Keep it in one place if that rule is later changed.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

export const signInSchema = z.object({
  email,
  // Sign-in accepts any stored password length so older accounts are not
  // locked out by a rule introduced after they registered.
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(100, "Keep your name under 100 characters."),
    email,
    password,
    confirmPassword: z.string().min(1, "Repeat your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "Repeat your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** First message per field, ready for inline form errors. */
export function fieldErrorsFrom(error: z.ZodError) {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}
