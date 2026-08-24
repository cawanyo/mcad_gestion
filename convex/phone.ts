/**
 * Phone normalization for Convex Auth (mirrors src/lib/phone.ts).
 * Duplicated here (not imported from src/) so convex/ stays a self-contained bundle.
 */
export function extractDigits(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

export function normalizePhone(phone: string): string {
  if (!phone) return "";
  let digits = extractDigits(phone);

  if (digits.startsWith("0033")) {
    digits = digits.substring(4);
    if (!digits.startsWith("0")) digits = "0" + digits;
  } else if (digits.startsWith("33") && digits.length === 11) {
    digits = "0" + digits.substring(2);
  }

  return digits;
}
