// Mirrors src/lib/equipmentCondition.ts on the web — shared by every place
// equipment condition is read or edited (form, card, detail, filters).
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
  TRES_BON: { bg: '#dcfce7', text: '#16a34a' },
  BON: { bg: '#ecfccb', text: '#65a30d' },
  MOYEN: { bg: '#fef3c7', text: '#d97706' },
  MAUVAIS: { bg: '#ffedd5', text: '#ea580c' },
  HORS_SERVICE: { bg: '#ffe4e6', text: '#e11d48' }
};

export function equipmentConditionLabel(condition?: string | null): string {
  return EQUIPMENT_CONDITION_LABELS[(condition as EquipmentCondition) || DEFAULT_EQUIPMENT_CONDITION] || EQUIPMENT_CONDITION_LABELS[DEFAULT_EQUIPMENT_CONDITION];
}
