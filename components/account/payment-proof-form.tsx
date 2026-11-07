"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  registerGroupPaymentProof,
  registerPaymentProof,
  type PaymentProofResult,
} from "@/app/account/bookings/[reference]/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
// Storage is the tighter free-plan quota (1 GB). Uploads measured ~108 kB at
// the previous settings, so the ceiling and edges are trimmed slightly; a GCash
// screenshot stays readable for the amount, reference, and recipient.
const MAX_UPLOAD_BYTES = 1536 * 1024;
const MAX_IMAGE_EDGE = 1600;
const MIN_IMAGE_EDGE = 720;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

type FormState =
  | { status: "idle" }
  | PaymentProofResult;

function proofFileType(file: File) {
  const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;

  if (MIME_EXTENSIONS[mime]) {
    return { extension: MIME_EXTENSIONS[mime], contentType: mime };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXTENSION_MIME[extension];

  return contentType ? { extension, contentType } : null;
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

type PreparedProof = {
  file: Blob;
  extension: string;
  contentType: string;
};

/**
 * Shrink the screenshot before it reaches Storage. The stored proof only needs
 * to be readable enough to check the amount, reference, and recipient; keeping
 * full-resolution phone screenshots wastes the free-plan storage allowance.
 */
async function compressProofImage(file: File): Promise<PreparedProof | null> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    let width = Math.max(
      1,
      Math.round(
        bitmap.width *
          Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height)),
      ),
    );
    let height = Math.max(
      1,
      Math.round(
        bitmap.height *
          Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height)),
      ),
    );
    let quality = 0.82;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) return null;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, width, height);

      const blob =
        (await canvasToBlob(canvas, "image/webp", quality)) ??
        (await canvasToBlob(canvas, "image/jpeg", quality));

      if (blob && blob.size > 0 && blob.size <= MAX_UPLOAD_BYTES) {
        const contentType = blob.type === "image/jpg" ? "image/jpeg" : blob.type;
        const extension = MIME_EXTENSIONS[contentType];

        if (extension) {
          return { file: blob, extension, contentType };
        }
      }

      const nextWidth = Math.round(width * 0.8);
      const nextHeight = Math.round(height * 0.8);

      if (nextWidth < MIN_IMAGE_EDGE || nextHeight < MIN_IMAGE_EDGE) {
        break;
      }

      width = nextWidth;
      height = nextHeight;
      quality = Math.max(0.55, quality - 0.06);
    }

    return null;
  } finally {
    bitmap.close();
  }
}

export function PaymentProofForm({
  bookingId,
  groupId,
  reference,
  timingNote = "before the hold ends",
  onSubmitted,
}: {
  bookingId?: string;
  groupId?: string;
  reference: string;
  timingNote?: string;
  onSubmitted?: () => void;
}) {
  const proofOwnerId = groupId ?? bookingId;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [proofConfirmed, setProofConfirmed] = useState(false);
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [pending, setPending] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setState({ status: "idle" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setState({
        status: "error",
        code: "invalid",
        message: "Choose a GCash screenshot before submitting.",
      });
      return;
    }

    if (file.size <= 0) {
      setState({
        status: "error",
        code: "invalid",
        message: "That file is empty. Choose the original GCash screenshot.",
      });
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      setState({
        status: "error",
        code: "invalid",
        message: `That file is ${formatFileSize(file.size)}. Choose an image 5 MB or smaller.`,
      });
      return;
    }

    const fileType = proofFileType(file);

    if (!fileType) {
      setState({
        status: "error",
        code: "invalid",
        message: "Use a JPEG, PNG, WebP, HEIC, or HEIF image.",
      });
      return;
    }

    if (!proofOwnerId) {
      setState({
        status: "error",
        code: "invalid",
        message: "This booking could not be identified. Refresh the page and try again.",
      });
      return;
    }

    if (!proofConfirmed) {
      setState({
        status: "error",
        code: "invalid",
        message:
          "Confirm that the screenshot is a genuine, unaltered record of your completed GCash transfer before submitting.",
      });
      return;
    }

    setPending(true);
    setState({ status: "idle" });

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPending(false);
      setState({
        status: "error",
        code: "session-expired",
        message: "Your session expired. Sign in again to submit this proof.",
      });
      return;
    }

    let prepared: PreparedProof | null = null;

    try {
      prepared = await compressProofImage(file);
    } catch {
      prepared = null;
    }

    if (!prepared && file.size <= MAX_UPLOAD_BYTES) {
      prepared = {
        file,
        extension: fileType.extension,
        contentType: fileType.contentType,
      };
    }

    if (!prepared) {
      setPending(false);
      setState({
        status: "error",
        code: "invalid",
        message:
          "We could not shrink this screenshot below 2 MB. Take a fresh screenshot or choose a smaller JPEG or PNG.",
      });
      return;
    }

    const proofPath = `${user.id}/${proofOwnerId}/${crypto.randomUUID()}.${prepared.extension}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, prepared.file, {
        contentType: prepared.contentType,
        upsert: false,
      });

    if (uploadError) {
      setPending(false);
      setState({
        status: "error",
        message:
          "The screenshot could not be uploaded. Check your connection and try again.",
      });
      return;
    }

    const result = groupId
      ? await registerGroupPaymentProof({
          groupId,
          reference,
          proofPath,
          transactionReference,
          proofConfirmed,
        })
      : await registerPaymentProof({
          bookingId: proofOwnerId,
          reference,
          proofPath,
          transactionReference,
          proofConfirmed,
        });

    if (result.status === "error") {
      await supabase.storage.from("payment-proofs").remove([proofPath]);
      setPending(false);
      setState(result);
      return;
    }

    setPending(false);
    setFile(null);
    setTransactionReference("");
    setProofConfirmed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setState(result);

    if (onSubmitted) onSubmitted();
    else router.refresh();
  }

  const signInHref = `/sign-in?next=${encodeURIComponent(
    groupId
      ? `/account/bookings/group/${reference}`
      : `/account/bookings/${reference}`,
  )}&notice=session-expired`;

  return (
    <section
      aria-labelledby="payment-proof-heading"
      className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7"
    >
      <p className="text-eyebrow font-bold uppercase text-accent-ink">
        Payment proof
      </p>
      <h2
        id="payment-proof-heading"
        className="mt-1 font-display text-xl font-bold text-heading"
      >
        {state.status === "success"
          ? "Screenshot recorded"
          : "Submit your GCash screenshot"}
      </h2>
      {state.status !== "success" ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Upload the screenshot from your GCash transfer {timingNote}. Keep the
          amount, reference, date, and recipient visible. Uploading proof does
          not mark the payment as paid.
        </p>
      ) : null}

      {state.status === "error" ? (
        <Alert
          variant="error"
          className="mt-5"
          role="alert"
          title="Proof not submitted"
        >
          <p>{state.message}</p>
          {state.code === "session-expired" ? (
            <p className="mt-2">
              <Link
                href={signInHref}
                className="font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                Sign in again
              </Link>{" "}
              to finish submitting this proof.
            </p>
          ) : null}
        </Alert>
      ) : null}

      {state.status === "success" ? (
        <Alert
          variant="success"
          className="mt-5"
          role="status"
          title="Proof submitted"
        >
          <p>{state.message}</p>
        </Alert>
      ) : null}

      {state.status !== "success" ? (
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <Field
          id="payment-proof-file"
          label="GCash screenshot"
          required
          hint="JPEG, PNG, WebP, HEIC, or HEIF. Up to 5 MB; compressed before upload."
        >
          <input
            ref={fileInputRef}
            id="payment-proof-file"
            name="proof"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            required
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-heading hover:border-line-strong focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
          />
        </Field>

        {file ? (
          <p className="text-caption text-muted">
            Selected: <strong className="text-heading">{file.name}</strong> (
            {formatFileSize(file.size)})
          </p>
        ) : null}

        <Field
          id="payment-proof-reference"
          label="GCash transaction reference"
          optionalLabel
          hint="Copy the reference from GCash if your screenshot does not show one clearly."
        >
          <Input
            id="payment-proof-reference"
            name="transactionReference"
            type="text"
            maxLength={120}
            autoComplete="off"
            value={transactionReference}
            onChange={(event) => setTransactionReference(event.target.value)}
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-page/50 p-4 text-sm leading-relaxed text-ink/80 transition-colors hover:border-line-strong">
          <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
            <input
              type="checkbox"
              checked={proofConfirmed}
              onChange={(event) => setProofConfirmed(event.target.checked)}
              required
              className="peer size-5 appearance-none rounded-md border border-line-strong bg-surface transition-colors checked:border-brand-blue checked:bg-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute text-sm font-bold text-white opacity-0 transition-opacity peer-checked:opacity-100"
            >
              ✓
            </span>
          </span>
          <span>
            I confirm that this is a genuine, unaltered screenshot of my
            completed GCash transfer for this booking. I understand that staff
            will verify the actual transfer and that false or altered proof may
            result in cancellation. See the{" "}
            <Link
              href="/policies/payments#payment-safety"
              className="font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
            >
              payment policy
            </Link>
            .
          </span>
        </label>

        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption leading-relaxed text-muted">
            Staff verify the actual incoming transfer before the payment is
            marked paid.
          </p>
          <Button
            type="submit"
            loading={pending}
            disabled={pending || !file || !proofConfirmed}
          >
            {pending ? "Submitting proof" : "Submit proof"}
          </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
