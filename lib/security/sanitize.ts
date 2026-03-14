// lib/security/sanitize.ts
// Shared input sanitization and validation helpers

/**
 * Strip HTML tags and trim whitespace from a string.
 * Use on any user-supplied text that will be stored or displayed.
 */
export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Validate an email string is sane (basic RFC 5322-ish check).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Clamp a number to a safe integer range.
 */
export function sanitizeNumber(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * Validate that a string is a valid UUID v4.
 */
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Validate a slug (alphanumeric + hyphens, no leading/trailing hyphens).
 */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Assert that a string doesn't exceed a maximum byte length.
 * Prevents extremely large payloads from hitting the DB.
 */
export function assertMaxLength(value: string, maxChars: number): boolean {
  return value.length <= maxChars;
}
