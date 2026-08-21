/**
 * MCAD Phone Normalization & Matching Utilities
 * Ensures seamless login and registration regardless of user formatting (spaces, dots, dashes, +33, etc.)
 */

/**
 * Strips all non-digit characters from a phone string (except a leading +)
 */
export function extractDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Normalizes phone numbers to standard French local format (0XXXXXXXXX)
 * Handles:
 * - "+33 6 12 34 56 78" -> "0612345678"
 * - "0033 6 12 34 56 78" -> "0612345678"
 * - "33612345678" -> "0612345678"
 * - "06 12 34 56 78" -> "0612345678"
 * - "06.12.34.56.78" -> "0612345678"
 * - "06-12-34-56-78" -> "0612345678"
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = extractDigits(phone);

  // If starts with international French prefix (33 or 0033)
  if (digits.startsWith('0033')) {
    digits = digits.substring(4);
    if (!digits.startsWith('0')) digits = '0' + digits;
  } else if (digits.startsWith('33') && digits.length === 11) {
    digits = '0' + digits.substring(2);
  }

  return digits;
}

/**
 * Formats a phone number for user-friendly display: "06 12 34 56 78"
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const digits = normalizePhone(phone);

  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }

  return phone.trim();
}

/**
 * Checks if two phone numbers match, irrespective of spaces, dashes, dots or prefixes
 */
export function arePhonesMatching(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;

  const rawA = phoneA.trim();
  const rawB = phoneB.trim();
  if (rawA === rawB) return true;

  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);

  if (normA && normB && normA === normB) return true;

  const digitsA = extractDigits(phoneA);
  const digitsB = extractDigits(phoneB);

  if (digitsA && digitsB) {
    if (digitsA === digitsB) return true;
    // Compare last 9 digits (e.g. 612345678)
    if (digitsA.length >= 8 && digitsB.length >= 8) {
      if (digitsA.endsWith(digitsB) || digitsB.endsWith(digitsA)) {
        return true;
      }
    }
  }

  return false;
}
