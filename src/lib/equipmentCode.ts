import type { ConvexReactClient } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Shared by every place that decodes a scanned equipment QR/barcode:
// EquipmentManagement (search-by-scan), AddItemToGroupModal and
// ReturnCheckModal (add/return-by-scan). Accepts either a bare token — the
// barcode's short code, or a legacy full equipment id from a barcode
// printed before shortCode existed — or a full /equipment/<id> URL (what
// the QR code encodes) — see EquipmentBarcode.tsx / EquipmentQrCode.tsx.
export function extractEquipmentId(scanned: string): string | null {
  const trimmed = scanned.trim();
  const match = trimmed.match(/\/equipment\/([a-zA-Z0-9]+)\/?$/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  return null;
}

// Turns whatever a scan (or manual entry) produced into a real equipment
// id + name via equipment.resolveCode, which handles both a raw Convex id
// and a short code in one query — callers don't need to know which one
// they got.
export async function resolveScannedEquipment(
  convex: ConvexReactClient,
  scanned: string
): Promise<{ equipmentId: string; name: string } | null> {
  const token = extractEquipmentId(scanned);
  if (!token) return null;
  return await convex.query(api.equipment.resolveCode, { code: token });
}
