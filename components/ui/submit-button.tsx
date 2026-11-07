"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Submit button for forms that post to a server action. The browser hears
 * nothing from a server action until it finishes, so this reads the form's
 * pending state to show the shared spinner, swap in a status label, and block
 * a second submit while the database work is still running.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" loading={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
