/**
 * Only allow same-site relative paths after sign-in, confirmation, or
 * recovery. Anything absolute, protocol-relative, or containing a backslash
 * falls back to the account page to prevent an open redirect.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/account",
) {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;

  try {
    const url = new URL(trimmed, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;

    // Auth pages are not useful destinations after a successful sign-in.
    if (
      url.pathname === "/sign-in" ||
      url.pathname === "/sign-up" ||
      url.pathname.startsWith("/auth/")
    ) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
