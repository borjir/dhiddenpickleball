"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  message,
  children,
  ...props
}: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
