'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Search, ScanBarcode, Plus, Package, LogIn, X } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { EquipmentCard } from './EquipmentCard';
import { EquipmentFormModal } from './EquipmentFormModal';
import { adaptEquipment } from '@/lib/convexAdapters';
import Link from 'next/link';

const BarcodeScannerModal = dynamic(
  () => import('./BarcodeScannerModal').then((m) => m.BarcodeScannerModal),
  { ssr: false }
);

// Accepts either an already-scanned bare equipment id, or a full URL
// pointing at /equipment/<id> (what the printed barcode encodes — see
// EquipmentBarcode.tsx).
function extractEquipmentId(scanned: string): string | null {
  const trimmed = scanned.trim();
  const match = trimmed.match(/\/equipment\/([a-zA-Z0-9]+)\/?$/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  return null;
}

export const EquipmentManagement: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [poleFilter, setPoleFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [showScanner, setShowScanner] = React.useState(false);
  const [showFormModal, setShowFormModal] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const polesRaw = useQuery(api.poles.list, {});
  const categoriesRaw = useQuery(api.equipmentCategories.list, {});
  const itemsRaw = useQuery(api.equipment.list, {
    search: debouncedSearch || undefined,
    poleId: (poleFilter || undefined) as Id<'poles'> | undefined,
    categoryId: (categoryFilter || undefined) as Id<'equipmentCategories'> | undefined
  });
  const items = React.useMemo(() => (itemsRaw || []).map(adaptEquipment), [itemsRaw]);
  const hasActiveFilters = !!debouncedSearch || !!poleFilter || !!categoryFilter;

  const handleDecode = (data: string) => {
    const id = extractEquipmentId(data);
    if (id) {
      setShowScanner(false);
      router.push(`/equipment/${id}`);
    } else {
      setScanError("Code-barres non reconnu. Réessayez ou utilisez la recherche par nom.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Matériel
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Répertoire du matériel de l'association — {items.length} référence{items.length > 1 ? 's' : ''}
          </p>
        </div>

        {isAuthenticated ? (
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un matériel</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Se connecter pour ajouter</span>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un matériel par nom..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => {
            setScanError(null);
            setShowScanner(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs transition-colors flex-shrink-0"
        >
          <ScanBarcode className="w-4 h-4 text-indigo-600" />
          <span>Scanner un code-barres</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <select
          value={poleFilter}
          onChange={(e) => setPoleFilter(e.target.value)}
          className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="">Tous les pôles</option>
          {(polesRaw || []).map((p: any) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="">Toutes les catégories</option>
          {(categoriesRaw || []).map((c: any) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        {(poleFilter || categoryFilter) && (
          <button
            onClick={() => {
              setPoleFilter('');
              setCategoryFilter('');
            }}
            className="flex items-center justify-center gap-1 px-3 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>
      {scanError && <p className="text-xs text-rose-600 font-medium">{scanError}</p>}

      {itemsRaw === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title={hasActiveFilters ? 'Aucun matériel trouvé' : 'Aucun matériel enregistré'}
          description={
            hasActiveFilters
              ? 'Essayez un autre terme de recherche ou réinitialisez les filtres.'
              : isAuthenticated
              ? 'Ajoutez le premier matériel pour commencer le répertoire.'
              : "Connectez-vous pour ajouter du matériel au répertoire."
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <EquipmentCard key={item.id} equipment={item} />
          ))}
        </div>
      )}

      <BarcodeScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} onDecode={handleDecode} />

      {isAuthenticated && (
        <EquipmentFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
};
