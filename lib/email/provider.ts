import { emailFrom, emailReplyTo, isEmailConfigured } from "./config";
import type { EmailDeliveryResult } from "./types";

type MailjetMessage = {
  Status?: string;
  Errors?: Array<{
    ErrorCode?: string;
    ErrorMessage?: string;
    ErrorRelatedTo?: string[];
  }>;
  To?: Array<{ MessageID?: number | string; MessageUUID?: string }>;
};

type MailjetResponse = {
  Messages?: MailjetMessage[];
  ErrorCode?: string;
  ErrorMessage?: string;
};

/**
 * Split an EMAIL_FROM value into Mailjet's From object. Accepts a bare address
 * or the RFC 5322 "Name <address>" form already supported by the template.
 */
function parseMailbox(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);

  if (!match) return { Email: value.trim() };

  const name = match[1].replace(/^"(.*)"$/, "$1").trim();

  return name
    ? { Email: match[2].trim(), Name: name }
    : { Email: match[2].trim() };
}

function messageError(message: MailjetMessage | undefined) {
  const detail = message?.Errors?.map((error) =>
    [error.ErrorCode, error.ErrorMessage, error.ErrorRelatedTo?.join(", ")]
      .filter(Boolean)
      .join(": "),
  )
    .filter(Boolean)
    .join("; ");

  return detail || null;
}

/**
 * Send one transactional message through Mailjet's Send API v3.1.
 *
 * Mailjet has no idempotency-key header. The outbox dedupe key is sent as
 * CustomID for tracing only; a retry after a timeout may still duplicate a
 * message at the provider.
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
      error:
        "Email provider is not configured. Set MAILJET_API_KEY, MAILJET_SECRET_KEY, and EMAIL_FROM.",
    };
  }

  if (to.length === 0) {
    return { status: "skipped", error: "No recipient address is available." };
  }

  const apiKey = process.env.MAILJET_API_KEY?.trim() ?? "";
  const secretKey = process.env.MAILJET_SECRET_KEY?.trim() ?? "";

  try {
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: parseMailbox(emailFrom()),
            To: to.map((email) => ({ Email: email })),
            ReplyTo: { Email: emailReplyTo() },
            Subject: subject,
            TextPart: text,
            HTMLPart: html,
            CustomID: idempotencyKey.slice(0, 64),
          },
        ],
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | MailjetResponse
      | null;

    if (!response.ok) {
      const detail =
        messageError(payload?.Messages?.[0]) ??
        [payload?.ErrorCode, payload?.ErrorMessage].filter(Boolean).join(": ");

      return {
        status: "failed",
        error: detail || `Mailjet returned HTTP ${response.status}.`,
      };
    }

    const message = payload?.Messages?.[0];

    if (message?.Status !== "success") {
      return {
        status: "failed",
        error: messageError(message) ?? "Mailjet did not accept the message.",
      };
    }

    const receipt = message.To?.[0];

    return {
      status: "sent",
      providerMessageId:
        receipt?.MessageUUID ??
        (receipt?.MessageID != null ? String(receipt.MessageID) : null),
    };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Email request failed.",
    };
  }
}
