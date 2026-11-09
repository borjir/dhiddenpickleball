"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { revealTarget } from "@/lib/scroll";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
// Storage is the tighter free-plan quota (1 GB). Uploads measured ~108 kB at
// the previous settings, so the ceiling and edges are trimmed slightly; a GCash
// screenshot stays readable for the amount, reference, and recipient.
const MAX_UPLOAD_BYTES = 1536 * 1024;
const MAX_IMAGE_EDGE = 1600;
const MIN_IMAGE_EDGE = 720;

type FormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

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

async function prepareImage(file: File): Promise<File | null> {
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
        return new File([blob], "payment-proof.webp", { type: blob.type });
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
  reference,
  mobile,
  timingNote = "before the hold ends",
  onSubmitted,
}: {
  reference: string;
  mobile: string;
  timingNote?: string;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [proofConfirmed, setProofConfirmed] = useState(false);
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [pending, setPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  // The submit button is at the bottom of a long form. When the proof is
  // rejected, bring the error at the top of the card back into view.
  useEffect(() => {
    if (state.status !== "error") return;

    const timer = window.setTimeout(() => {
      revealTarget(sectionRef.current, { focus: false, block: "start" });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [state.status]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setState({ status: "idle" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setState({
        status: "error",
        message: "Choose a GCash screenshot before submitting.",
      });
      return;
    }

    if (file.size <= 0) {
      setState({
        status: "error",
        message: "That file is empty. Choose the original GCash screenshot.",
      });
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      setState({
        status: "error",
        message: `That file is ${formatFileSize(file.size)}. Choose an image 5 MB or smaller.`,
      });
      return;
    }

    if (!proofConfirmed) {
      setState({
        status: "error",
        message:
          "Confirm that the screenshot is a genuine, unaltered record of your completed GCash transfer before submitting.",
      });
      return;
    }

    if (!turnstileToken) {
      setState({
        status: "error",
        message:
          "Complete the security check above the submit button, then try again.",
      });
      return;
    }

    setPending(true);
    setState({ status: "idle" });

    let prepared: File = file;

    if (file.type.startsWith("image/") && file.type !== "image/webp") {
      const compressed = await prepareImage(file);

      if (compressed) {
        prepared = compressed;
      } else if (file.size > MAX_UPLOAD_BYTES) {
        setPending(false);
        setState({
          status: "error",
          message:
            "We could not shrink this screenshot below 2 MB. Take a fresh screenshot or choose a smaller JPEG or PNG.",
        });
        return;
      }
    }

    const body = new FormData();
    body.set("file", prepared);
    body.set("reference", reference);
    body.set("mobile", mobile);
    body.set("transactionReference", transactionReference);
    body.set("turnstileToken", turnstileToken);

    let result: { status?: string; message?: string };

    try {
      const response = await fetch("/api/payment-proof", {
        method: "POST",
        body,
      });
      result = (await response.json()) as { status?: string; message?: string };
    } catch {
      setPending(false);
      setTurnstileToken(null);
      setTurnstileReset((count) => count + 1);
      setState({
        status: "error",
        message:
          "The screenshot could not be uploaded. Check your connection and try again.",
      });
      return;
    }

    setPending(false);

    if (result.status !== "success") {
      // The failed request consumed the token, so refresh the challenge.
      setTurnstileToken(null);
      setTurnstileReset((count) => count + 1);
      setState({
        status: "error",
        message:
          result.message ??
          "The payment proof could not be saved. Try again.",
      });
      return;
    }

    setFile(null);
    setTransactionReference("");
    setProofConfirmed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setState({
      status: "success",
      message:
        result.message ?? "Payment proof received. Staff will verify it shortly.",
    });

    if (onSubmitted) onSubmitted();
    else router.refresh();
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="payment-proof-heading"
      className="scroll-mt-24 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7"
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
          Upload a clear GCash screenshot {timingNote}. Show the amount,
          reference, date, and recipient. Proof does not mark the payment as
          paid.
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
            hint="JPEG, PNG, WebP, or PDF. Up to 5 MB; images are compressed before upload."
          >
            <input
              ref={fileInputRef}
              id="payment-proof-file"
              name="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
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
              maxLength={100}
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
              I confirm this is a genuine screenshot of my completed GCash
              transfer. I understand staff verify the actual transfer and that
              false proof may be cancelled. See the{" "}
              <Link
                href="/policies/payments#payment-safety"
                className="font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
              >
                payment policy
              </Link>
              .
            </span>
          </label>

          <div className="rounded-xl border border-line bg-page/40 p-3">
            <p className="mb-2 text-caption font-semibold text-muted">
              Quick security check — protects your booking upload.
            </p>
            <TurnstileWidget
              action="payment_proof"
              onToken={setTurnstileToken}
              resetSignal={turnstileReset}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption leading-relaxed text-muted">
              Staff verify the transfer before the payment is marked paid.
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
