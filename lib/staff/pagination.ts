/**
 * Staff list pagination helpers.
 *
 * Pages are URL-driven so a refresh, bookmark, or Back button keeps the staff
 * member on the same page with the same filters.
 */

export function staffPageNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function staffPageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Build a page link without dropping the filters the staff member applied.
 * Flash messages are intentionally not carried forward.
 */
export function staffPageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "page" || key === "notice" || key === "error") continue;
    search.set(key, value);
  }

  if (page > 1) search.set("page", String(page));

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
