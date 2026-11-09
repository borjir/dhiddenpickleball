const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileGate =
  | { ok: true }
  | { ok: false; message: string; unavailable?: boolean };

function expectedHostnames() {
  return (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Test secrets start with 1x or 2x. They always pass or always fail and do not
 * return action/hostname metadata. They are only honoured outside production so
 * a test key can never accidentally weaken the deployed Worker.
 */
function isTestSecret(secret: string) {
  return secret.startsWith("1x") || secret.startsWith("2x");
}

/**
 * Verifies a Turnstile token exactly once at the server boundary. The caller
 * must run this before its existing database or storage work, and must not
 * expose the secret or the raw siteverify response to the browser.
 */
export async function verifyTurnstile({
  token,
  action,
  remoteIp,
}: {
  token: string;
  action: string;
  remoteIp?: string | null;
}): Promise<TurnstileGate> {
  const secret = process.env.TURNSTILE_SECRET?.trim();

  if (!secret) {
    return {
      ok: false,
      unavailable: true,
      message:
        "The security check is not configured. Contact the club to continue.",
    };
  }

  const testMode = isTestSecret(secret);

  if (process.env.NODE_ENV === "production" && testMode) {
    return {
      ok: false,
      unavailable: true,
      message:
        "The security check is not configured correctly. Contact the club to continue.",
    };
  }

  const hostnames = expectedHostnames();

  if (!testMode && hostnames.length === 0) {
    return {
      ok: false,
      unavailable: true,
      message:
        "The security check is not configured correctly. Contact the club to continue.",
    };
  }

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return {
      ok: false,
      message: "Complete the security check before submitting.",
    };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) body.set("remoteip", remoteIp);

  let result: {
    success?: boolean;
    action?: string;
    hostname?: string;
    "error-codes"?: string[];
  };

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        unavailable: true,
        message: "The security check is unavailable. Try again in a moment.",
      };
    }

    result = (await response.json()) as typeof result;
  } catch {
    return {
      ok: false,
      unavailable: true,
      message: "The security check is unavailable. Try again in a moment.",
    };
  }

  if (result.success !== true) {
    const codes = result["error-codes"] ?? [];

    // Safe diagnostics: no token, IP, or secret value is logged.
    console.warn("[turnstile] siteverify rejected", {
      codes,
      action: result.action,
      hostname: result.hostname,
      expectedAction: action,
      expectedHostnames: hostnames,
      testMode,
      secretLength: secret.length,
    });

    if (
      codes.includes("invalid-input-response") ||
      codes.includes("timeout-or-duplicate")
    ) {
      return {
        ok: false,
        message:
          "The security check expired. Refresh the page and try again.",
      };
    }

    return {
      ok: false,
      message: "The security check did not pass. Refresh the page and try again.",
    };
  }

  // Test secrets do not return action or hostname metadata.
  if (testMode) return { ok: true };

  if (result.action !== action) {
    return {
      ok: false,
      message: "The security check did not match this form. Refresh the page and try again.",
    };
  }

  if (!hostnames.includes((result.hostname ?? "").toLowerCase())) {
    return {
      ok: false,
      message: "The security check did not match this site. Refresh the page and try again.",
    };
  }

  return { ok: true };
}

/** Reads the visitor IP that Cloudflare forwards to the Worker. */
export function turnstileClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  return (
    headers.get("cf-connecting-ip") ??
    (forwarded ? forwarded.split(",")[0]?.trim() : null) ??
    null
  );
}
