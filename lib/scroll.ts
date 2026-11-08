type RevealOptions = {
  focus?: boolean;
  block?: ScrollLogicalPosition;
};

/**
 * Brings a validation message, result, or new step into view. Guest forms are
 * long on phones, so a failed submit must never leave its message off-screen.
 * The target needs `tabIndex={-1}` when `focus` is on.
 */
export function revealTarget(
  target: Element | null,
  { focus = true, block = "center" }: RevealOptions = {},
) {
  if (!target) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block,
  });

  // Scroll first, then focus without letting the browser jump somewhere else.
  if (focus && target instanceof HTMLElement) {
    target.focus({ preventScroll: true });
  }
}
