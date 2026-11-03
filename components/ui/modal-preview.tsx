"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

/** Interactive modal demonstration for the design reference page only. */
export function ModalPreview() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button onClick={() => dialogRef.current?.showModal()}>
        Open dialog preview
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="dialog-preview-title"
        aria-describedby="dialog-preview-description"
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            close();
          }
        }}
        className="m-auto w-[min(92vw,30rem)] rounded-lg border border-line bg-surface p-0 text-ink shadow-raised"
      >
        <div className="p-6">
          <p className="text-eyebrow font-bold uppercase text-warning">
            Demonstration only
          </p>
          <h3
            id="dialog-preview-title"
            className="mt-2 font-display text-xl font-bold text-heading"
          >
            Confirm a payment review
          </h3>
          <p
            id="dialog-preview-description"
            className="mt-2 text-sm leading-relaxed text-muted"
          >
            Destructive or financial actions will require a deliberate
            confirmation like this. Nothing is saved in this preview.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="navy" onClick={close}>
              I understand
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
