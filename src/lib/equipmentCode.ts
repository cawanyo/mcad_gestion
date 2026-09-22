// Shared by every place that decodes a scanned equipment QR/barcode:
// EquipmentManagement (search-by-scan), AddItemToGroupModal and
// ReturnCheckModal (add/return-by-scan). Accepts either a bare equipment
// id (what the barcode encodes) or a full /equipment/<id> URL (what the QR
// code encodes) — see EquipmentBarcode.tsx / EquipmentQrCode.tsx.
export function extractEquipmentId(scanned: string): string | null {
  const trimmed = scanned.trim();
  const match = trimmed.match(/\/equipment\/([a-zA-Z0-9]+)\/?$/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  return null;
}
