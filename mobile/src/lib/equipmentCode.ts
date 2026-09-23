import { convex } from '../convex/ConvexClientProvider';
import { api } from '../../../convex/_generated/api';

// Mirrors src/lib/equipmentCode.ts on the web — same two formats a scan (or
// manual entry) can produce: the QR's full /equipment/<id> URL, or the
// barcode's bare short code (or a legacy full id for equipment created
// before shortCode existed).
export function extractEquipmentId(scanned: string): string | null {
  const trimmed = scanned.trim();
  const match = trimmed.match(/\/equipment\/([a-zA-Z0-9]+)\/?$/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  return null;
}

export async function resolveScannedEquipment(scanned: string): Promise<{ equipmentId: string; name: string } | null> {
  const token = extractEquipmentId(scanned);
  if (!token) return null;
  return await convex.query(api.equipment.resolveCode, { code: token });
}

// The web app's own production domain — QR codes must encode this absolute
// URL (not just the bare id) so scanning with the phone's stock camera app,
// outside this app entirely, opens the equipment's public page directly.
export const EQUIPMENT_WEB_BASE_URL = 'https://mcad-toulouse-cyan.vercel.app';
