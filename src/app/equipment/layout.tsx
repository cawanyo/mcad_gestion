import { EquipmentHeader } from '@/components/equipment/EquipmentHeader';

export const metadata = {
  title: 'Matériel — MCAD',
  description: 'Répertoire du matériel MCAD : consultation, ajout et recherche par nom ou QR code.',
};

export default function EquipmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <EquipmentHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
