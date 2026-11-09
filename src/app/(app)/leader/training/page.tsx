'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  GraduationCap,
  BookOpen,
  Clock,
  Layers,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { adaptTrainingModule } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { useAppShell } from '@/contexts/AppShellContext';
import { useRequireLeaderOrAdmin } from '@/hooks/useRequireLeaderOrAdmin';
import { TrainingModule } from '@/types';
import { TrainingModuleEditorPage } from '@/components/training/TrainingModuleEditorPage';
import { ConfirmModal } from '@/components/ui';

export default function LeaderTrainingManagementPage() {
  const router = useRouter();
  const allowed = useRequireLeaderOrAdmin();
  const { currentUser, poles } = useAppShell();

  const [selectedPoleFilter, setSelectedPoleFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState<TrainingModule | null>(null);

  const [deletingModule, setDeletingModule] = React.useState<TrainingModule | null>(null);
  const [deletingLoading, setDeletingLoading] = React.useState(false);

  const [notification, setNotification] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const modulesRaw = useQuery(api.training.list, {
    poleId: selectedPoleFilter !== 'all' ? (selectedPoleFilter as any) : undefined,
  });
  const loading = modulesRaw === undefined;
  const modules = React.useMemo(
    () => (modulesRaw || []).map(adaptTrainingModule) as TrainingModule[],
    [modulesRaw]
  );

  const removeModule = useMutation(api.training.remove);

  React.useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(t);
    }
  }, [notification]);

  if (!currentUser || !allowed) return null;

  // Render Full Page Editor when editing or creating
  if (isEditorOpen) {
    return (
      <TrainingModuleEditorPage
        poles={poles}
        editingModule={editingModule}
        onBack={() => {
          setIsEditorOpen(false);
          setEditingModule(null);
        }}
        onSaved={() => {
          setIsEditorOpen(false);
          setEditingModule(null);
          setNotification({
            text: editingModule ? 'Module mis à jour avec succès.' : 'Module créé avec succès.',
            type: 'success',
          });
        }}
      />
    );
  }

  const filteredModules = modules.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.pole?.name && m.pole.name.toLowerCase().includes(q))
    );
  });

  const handleDeleteModule = async () => {
    if (!deletingModule) return;
    try {
      setDeletingLoading(true);
      await removeModule({ moduleId: deletingModule.id as Id<'trainingModules'> });
      setNotification({ text: 'Module supprimé.', type: 'success' });
      setDeletingModule(null);
    } catch (e) {
      setNotification({ text: convexErrorMessage(e, 'Erreur lors de la suppression.'), type: 'error' });
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 font-sans py-2 sm:py-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-md border border-zinc-200/70 p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/leader')}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <span>Formations</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                {modules.length}
              </span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingModule(null);
            setIsEditorOpen(true);
          }}
          className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouveau module</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un module ou une leçon..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <select
          value={selectedPoleFilter}
          onChange={(e) => setSelectedPoleFilter(e.target.value)}
          className="p-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="all">Tous les pôles & MCAD</option>
          <option value="mcad">MCAD (Tous les pôles)</option>
          {poles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Modules List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
          <span>Chargement des modules de formation...</span>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/70 p-8 text-center space-y-3 shadow-xs">
          <BookOpen className="w-8 h-8 text-zinc-400 mx-auto" />
          <h2 className="text-sm font-bold text-zinc-900">Aucun module de formation</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Aucun résultat ne correspond à votre recherche.'
              : 'Créez un premier module pour formaliser la formation des membres de vos pôles.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingModule(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer un module</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModules.map((m) => (
            <div
              key={m.id}
              className="bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/80 p-4 shadow-xs flex flex-col justify-between space-y-3 group hover:border-zinc-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white truncate max-w-[150px]"
                    style={{ backgroundColor: m.pole?.color || '#2563eb' }}
                  >
                    {m.pole?.name || 'Pôle'}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500">
                    {m.lessons?.length || 0} leçon{m.lessons && m.lessons.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-snug line-clamp-1">
                    {m.title}
                  </h3>
                  {m.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
                  {m.level && <span>Niveau : {m.level}</span>}
                  {m.estimatedDuration && <span>• {m.estimatedDuration}</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingModule(m);
                    setIsEditorOpen(true);
                  }}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingModule(m)}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Supprimer ce module"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingModule)}
        onClose={() => setDeletingModule(null)}
        onConfirm={handleDeleteModule}
        title="Supprimer le module"
        description={`Êtes-vous sûr de vouloir supprimer définitivement le module "${deletingModule?.title}" ? Toutes les leçons associées seront effacées.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Conserver"
        variant="danger"
        loading={deletingLoading}
      />
    </div>
  );
}
