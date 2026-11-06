import { emailFrom, emailReplyTo, isEmailConfigured } from "./config";
import type { EmailDeliveryResult } from "./types";

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

/**
 * Send one transactional message through Resend's HTTP API.
 *
 * The outbox dedupe key is also sent as the provider idempotency key, so a
 * retry after a timeout cannot create a second message.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  idempotencyKey,
}: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}): Promise<EmailDeliveryResult> {
  if (!isEmailConfigured()) {
    return {
      status: "skipped",
      error: "Email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM.",
    };
  }

  if (to.length === 0) {
    return { status: "skipped", error: "No recipient address is available." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: emailFrom(),
        to,
        subject,
        html,
        text,
        reply_to: emailReplyTo(),
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | ResendResponse
      | null;

    if (!response.ok) {
      const detail =
        payload?.message ||
        payload?.name ||
        `Resend returned HTTP ${response.status}.`;
      return { status: "failed", error: detail };
    }

    return { status: "sent", providerMessageId: payload?.id ?? null };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Email request failed.",
    };
  }
}
