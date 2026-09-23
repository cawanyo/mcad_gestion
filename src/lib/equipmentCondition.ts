// Shared by every place equipment condition is read or edited (form,
// card, detail page, filters) — a single source for labels/colors/order
// so the 5-point scale can't drift between them.
export const EQUIPMENT_CONDITIONS = ['TRES_BON', 'BON', 'MOYEN', 'MAUVAIS', 'HORS_SERVICE'] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

export const DEFAULT_EQUIPMENT_CONDITION: EquipmentCondition = 'TRES_BON';

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  TRES_BON: 'Très bon',
  BON: 'Bon',
  MOYEN: 'Moyen',
  MAUVAIS: 'Mauvais',
  HORS_SERVICE: 'Ne fonctionne pas'
};

export const EQUIPMENT_CONDITION_COLORS: Record<EquipmentCondition, { bg: string; text: string }> = {
  TRES_BON: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  BON: { bg: 'bg-lime-100', text: 'text-lime-700' },
  MOYEN: { bg: 'bg-amber-100', text: 'text-amber-700' },
  MAUVAIS: { bg: 'bg-orange-100', text: 'text-orange-700' },
  HORS_SERVICE: { bg: 'bg-rose-100', text: 'text-rose-700' }
};

export function equipmentConditionLabel(condition?: string | null): string {
  return EQUIPMENT_CONDITION_LABELS[(condition as EquipmentCondition) || DEFAULT_EQUIPMENT_CONDITION] || EQUIPMENT_CONDITION_LABELS[DEFAULT_EQUIPMENT_CONDITION];
}
