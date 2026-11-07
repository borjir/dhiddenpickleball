"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  message,
  pendingLabel,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  message: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type="submit"
      loading={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
