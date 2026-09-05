'use client';

import React from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Layers,
  CheckCircle2,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Save,
  Check,
  Upload,
  Loader2,
  X,
  Play,
  MessageSquare,
  Edit2,
  AlertTriangle,
  Lock,
  Sparkles,
  GripVertical
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { adaptChecklist } from '@/lib/convexAdapters';
import { convexErrorMessage } from '@/lib/convexErrors';
import { Checklist, Pole, Event, User } from '@/types';
import { ChecklistRunnerModal } from './ChecklistRunnerModal';
import { ChecklistFeedbackModal } from './ChecklistFeedbackModal';
import { ChecklistFormModal } from './ChecklistFormModal';
import { ConfirmModal, Modal, Badge, Toast, ToastState, MediaViewer } from '@/components/ui';
import { uploadMediaWithProgress, UploadProgressInfo } from '@/lib/upload-client';

interface ChecklistsWebProps {
  checklists?: Checklist[];
  poles: Pole[];
  events: Event[];
  currentUser?: User | null;
  onRefresh?: () => void;
}

export const ChecklistsWeb: React.FC<ChecklistsWebProps> = ({
  poles = [],
  events = [],
  currentUser,
  onRefresh
}) => {
  const [selectedPoleId, setSelectedPoleId] = React.useState<string>('all');
  const checklistsRaw = useQuery(
    api.checklists.list,
    selectedPoleId && selectedPoleId !== 'all' ? { poleId: selectedPoleId as Id<'poles'> } : {}
  );
  const loading = checklistsRaw === undefined;
  const checklists = React.useMemo(() => (checklistsRaw || []).map(adaptChecklist), [checklistsRaw]);
  const [activeEditorChecklistId, setActiveEditorChecklistId] = React.useState<string | null>(null);
  // Re-derived from the reactive `checklists` list on every render instead of
  // held as its own snapshot, so edits (add/remove step, associate event...)
  // show up immediately without a manual refetch.
  const activeEditorChecklist = activeEditorChecklistId
    ? checklists.find((c) => c.id === activeEditorChecklistId) || null
    : null;
  const [activeEditorTab, setActiveEditorTab] = React.useState<'etapes' | 'events'>('etapes');
  const [searchQuery, setSearchQuery] = React.useState('');

  const updateChecklistMutation = useMutation(api.checklists.update);
  const removeChecklistMutation = useMutation(api.checklists.remove);

  // Runner & Feedback Modals
  const [runningChecklist, setRunningChecklist] = React.useState<any | null>(null);
  const [feedbackChecklist, setFeedbackChecklist] = React.useState<any | null>(null);

  // New step form modal
  const [showAddStepModal, setShowAddStepModal] = React.useState(false);
  const [newStepTitle, setNewStepTitle] = React.useState('');
  const [newStepDesc, setNewStepDesc] = React.useState('');
  const [newStepMediaType, setNewStepMediaType] = React.useState<'NONE' | 'PHOTO' | 'VIDEO' | 'TEXT'>('TEXT');
  const [newStepMediaUrl, setNewStepMediaUrl] = React.useState('');
  const [uploadingMedia, setUploadingMedia] = React.useState(false);

  // Edit checklist title/description modal
  const [showEditInfoModal, setShowEditInfoModal] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [savingInfo, setSavingInfo] = React.useState(false);

  // Create checklist modal
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  // Beautiful Confirmation Modals
  const [deletingChecklist, setDeletingChecklist] = React.useState<Checklist | null>(null);
  const [deletingStepIndex, setDeletingStepIndex] = React.useState<number | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Step drag-to-reorder
  const [dragStepIndex, setDragStepIndex] = React.useState<number | null>(null);
  const [dragOverStepIndex, setDragOverStepIndex] = React.useState<number | null>(null);
  const [reorderingSteps, setReorderingSteps] = React.useState(false);

  // Toast
  const [toast, setToast] = React.useState<ToastState | null>(null);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER' ||
    ((currentUser?.poleLeaderships?.length ?? 0) > 0);

  const isMemberOfPole = React.useCallback(
    (poleId?: string | null) => {
      if (!currentUser || !poleId) return false;
      const inMemberships = (currentUser.poleMemberships || []).some(
        (pm) => (pm.poleId === poleId || pm.pole?.id === poleId) && pm.status === 'ACTIVE'
      );
      const inLeaderships = (currentUser.poleLeaderships || []).some(
        (pl) => pl.poleId === poleId || pl.pole?.id === poleId
      );
      return inMemberships || inLeaderships;
    },
    [currentUser]
  );

  const myPoles = React.useMemo(
    () => poles.filter((p) => isMemberOfPole(p.id)),
    [poles, isMemberOfPole]
  );
  const otherPoles = React.useMemo(
    () => poles.filter((p) => !isMemberOfPole(p.id)),
    [poles, isMemberOfPole]
  );

  const [stepUploadProgress, setStepUploadProgress] = React.useState<UploadProgressInfo | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploadingMedia(true);
    setStepUploadProgress(null);
    try {
      const result = await uploadMediaWithProgress(file, {
        folder: 'mcad_checklists/steps',
        onProgress: (p) => setStepUploadProgress(p)
      });

      setNewStepMediaUrl(result.url);
      setNewStepMediaType(result.mediaType);
      setToast({
        message: 'Média téléversé avec succès !',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      setToast({
        message: err.message || 'Erreur lors du téléversement du média.',
        type: 'error'
      });
    } finally {
      setUploadingMedia(false);
      setStepUploadProgress(null);
    }
  };

  const handleChecklistCreated = (created: any) => {
    setShowCreateModal(false);
    setActiveEditorChecklistId(created._id);
    if (onRefresh) onRefresh();
    setToast({ message: 'Checklist créée avec succès !', type: 'success' });
  };

  // Edit Checklist Title & Description
  const handleUpdateChecklistInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeaderOrAdmin || !activeEditorChecklist) return;

    try {
      setSavingInfo(true);
      await updateChecklistMutation({
        checklistId: activeEditorChecklist.id as Id<'checklists'>,
        title: editTitle.trim(),
        description: editDescription.trim()
      });
      setShowEditInfoModal(false);
      if (onRefresh) onRefresh();
      setToast({ message: 'Informations mises à jour.', type: 'success' });
    } catch (e) {
      setToast({ message: convexErrorMessage(e, 'Erreur lors de la mise à jour.'), type: 'error' });
    } finally {
      setSavingInfo(false);
    }
  };

  // Add Step
  const handleAddStep = async () => {
    if (!isLeaderOrAdmin || !activeEditorChecklist || !newStepTitle.trim()) return;

    const currentSteps = (activeEditorChecklist.steps || []).map((s) => ({
      title: s.title,
      description: s.description || undefined,
      details: s.details || undefined,
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl || undefined,
      mediaThumbnail: s.mediaThumbnail || undefined
    }));
    const newStep = {
      title: newStepTitle.trim(),
      description: newStepDesc.trim() || undefined,
      mediaType: newStepMediaType,
      mediaUrl: newStepMediaUrl || undefined,
      mediaThumbnail: newStepMediaType === 'PHOTO' ? newStepMediaUrl || undefined : undefined
    };

    const updatedSteps = [...currentSteps, newStep];

    try {
      setActionLoading(true);
      await updateChecklistMutation({ checklistId: activeEditorChecklist.id as Id<'checklists'>, steps: updatedSteps });
      setShowAddStepModal(false);
      setNewStepTitle('');
      setNewStepDesc('');
      setNewStepMediaType('TEXT');
      setNewStepMediaUrl('');
      setToast({ message: 'Étape ajoutée avec succès.', type: 'success' });
    } catch (e) {
      setToast({ message: convexErrorMessage(e, "Erreur lors de l'ajout."), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Reorder Steps (drag & drop)
  const handleMoveStep = async (fromIndex: number, toIndex: number) => {
    if (!isLeaderOrAdmin || !activeEditorChecklist || fromIndex === toIndex) return;

    const currentSteps = (activeEditorChecklist.steps || []).map((s) => ({
      title: s.title,
      description: s.description || undefined,
      details: s.details || undefined,
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl || undefined,
      mediaThumbnail: s.mediaThumbnail || undefined
    }));
    const reordered = [...currentSteps];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    try {
      setReorderingSteps(true);
      await updateChecklistMutation({ checklistId: activeEditorChecklist.id as Id<'checklists'>, steps: reordered });
    } catch (e) {
      setToast({ message: convexErrorMessage(e, "Erreur lors du réordonnancement."), type: 'error' });
    } finally {
      setReorderingSteps(false);
    }
  };

  // Confirm Delete Step
  const handleConfirmDeleteStep = async () => {
    if (!isLeaderOrAdmin || !activeEditorChecklist || deletingStepIndex === null) return;

    const updatedSteps = (activeEditorChecklist.steps || [])
      .filter((_, i) => i !== deletingStepIndex)
      .map((s) => ({
        title: s.title,
        description: s.description || undefined,
        details: s.details || undefined,
        mediaType: s.mediaType,
        mediaUrl: s.mediaUrl || undefined,
        mediaThumbnail: s.mediaThumbnail || undefined
      }));

    try {
      setActionLoading(true);
      await updateChecklistMutation({ checklistId: activeEditorChecklist.id as Id<'checklists'>, steps: updatedSteps });
      setDeletingStepIndex(null);
      setToast({ message: 'Étape supprimée.', type: 'success' });
    } catch (e) {
      setToast({ message: convexErrorMessage(e, 'Erreur lors de la suppression.'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Delete Checklist
  const handleConfirmDeleteChecklist = async () => {
    if (!isLeaderOrAdmin || !deletingChecklist) return;

    try {
      setActionLoading(true);
      await removeChecklistMutation({ checklistId: deletingChecklist.id as Id<'checklists'> });
      if (activeEditorChecklist?.id === deletingChecklist.id) {
        setActiveEditorChecklistId(null);
      }
      setDeletingChecklist(null);
      if (onRefresh) onRefresh();
      setToast({ message: 'Checklist supprimée avec succès.', type: 'success' });
    } catch (e) {
      setToast({ message: convexErrorMessage(e, 'Erreur lors de la suppression.'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssociateEvent = async (eventId: string) => {
    if (!isLeaderOrAdmin || !activeEditorChecklist) return;

    try {
      await updateChecklistMutation({ checklistId: activeEditorChecklist.id as Id<'checklists'>, associateEventId: eventId as Id<'events'> });
      setToast({ message: 'Culte associé à cette checklist.', type: 'success' });
    } catch (e) {
      setToast({ message: convexErrorMessage(e, "Erreur lors de l'association."), type: 'error' });
    }
  };

  const handleDissociateEvent = async (eventId: string) => {
    if (!isLeaderOrAdmin || !activeEditorChecklist) return;

    try {
      await updateChecklistMutation({ checklistId: activeEditorChecklist.id as Id<'checklists'>, dissociateEventId: eventId as Id<'events'> });
      setToast({ message: 'Association retirée.', type: 'info' });
    } catch (e) {
      setToast({ message: convexErrorMessage(e, "Erreur lors du retrait de l'association."), type: 'error' });
    }
  };

  const filteredChecklists = checklists.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  const myChecklists = React.useMemo(
    () => filteredChecklists.filter((c) => isMemberOfPole(c.poleId)),
    [filteredChecklists, isMemberOfPole]
  );
  const otherChecklists = React.useMemo(
    () => filteredChecklists.filter((c) => !isMemberOfPole(c.poleId)),
    [filteredChecklists, isMemberOfPole]
  );

  const renderChecklistCard = (chk: Checklist) => (
    <div
      key={chk.id}
      className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900">{chk.title}</h3>
          <Badge variant="success" size="sm">
            {chk.steps?.length || 0} étape(s)
          </Badge>
        </div>
        {chk.pole && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: chk.pole.color || '#4f46e5' }}
            />
            <span className="text-[11px] font-bold text-slate-500">{chk.pole.name}</span>
          </div>
        )}
        <p className="text-xs text-slate-500 line-clamp-2">
          {chk.description || 'Guide opérationnel de service.'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => setRunningChecklist(chk)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Exécuter la checklist</span>
        </button>

        <div className="flex items-center justify-between pt-1">
          {isLeaderOrAdmin ? (
            <button
              onClick={() => {
                setActiveEditorChecklistId(chk.id);
                setEditTitle(chk.title);
                setEditDescription(chk.description || '');
              }}
              className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              <span>Gérer & modifier</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setRunningChecklist(chk)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span>Voir les étapes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setFeedbackChecklist(chk)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Voir les retours & commentaires"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {isLeaderOrAdmin && (
              <button
                onClick={() => setDeletingChecklist(chk)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Supprimer la checklist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Checklists Opérationnelles</span>
            <Badge variant="primary" size="sm">
              {checklists.length}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLeaderOrAdmin
              ? 'Guides d’exécution pas à pas avec photos/vidéos et affectation aux cultes.'
              : 'Consultez et exécutez vos guides de service pas à pas.'}
          </p>
        </div>

        {isLeaderOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouvelle checklist</span>
          </button>
        )}
      </div>

      {/* Pole Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pole Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedPoleId('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedPoleId === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <span>Tous les pôles</span>
          </button>

          {myPoles.map((p) => {
            const isSelected = selectedPoleId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPoleId(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: p.color || '#4f46e5' }}
                />
                <span>{p.name}</span>
              </button>
            );
          })}

          {myPoles.length > 0 && otherPoles.length > 0 && (
            <div className="h-6 w-px bg-slate-300 mx-1 flex-shrink-0" />
          )}

          {otherPoles.map((p) => {
            const isSelected = selectedPoleId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPoleId(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: p.color || '#4f46e5' }}
                />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une checklist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium shadow-xs"
          />
        </div>
      </div>

      {/* Main Checklist Editor / List */}
      {!activeEditorChecklist ? (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <CheckSquare className="w-4 h-4 animate-bounce text-indigo-600" />
              <span>Chargement des checklists...</span>
            </div>
          ) : filteredChecklists.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Aucune checklist trouvée</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isLeaderOrAdmin
                  ? 'Créez des checklists pour formaliser les étapes de service de vos équipes.'
                  : 'Aucun guide de service n’a encore été configuré.'}
              </p>
              {isLeaderOrAdmin && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors"
                >
                  + Créer une checklist
                </button>
              )}
            </div>
          ) : selectedPoleId === 'all' && myChecklists.length > 0 && otherChecklists.length > 0 ? (
            <div className="space-y-6">
              {/* Mes Checklists de Pôle */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                    Mes checklists de pôle ({myChecklists.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myChecklists.map(renderChecklistCard)}
                </div>
              </div>

              {/* Petit trait séparateur */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-50 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Autres checklists ({otherChecklists.length})
                  </span>
                </div>
              </div>

              {/* Autres Checklists */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {otherChecklists.map(renderChecklistCard)}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredChecklists.map(renderChecklistCard)}
            </div>
          )}
        </div>
      ) : (
        /* Checklist Editor (Leader View) */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveEditorChecklistId(null)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{activeEditorChecklist.title}</h2>
                  {isLeaderOrAdmin && (
                    <button
                      onClick={() => {
                        setEditTitle(activeEditorChecklist.title);
                        setEditDescription(activeEditorChecklist.description || '');
                        setShowEditInfoModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg"
                      title="Modifier titre / description"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">{activeEditorChecklist.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setRunningChecklist(activeEditorChecklist)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Tester la checklist</span>
              </button>

              <button
                onClick={() => setFeedbackChecklist(activeEditorChecklist)}
                className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
                title="Retours des membres"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              {isLeaderOrAdmin && (
                <>
                  <button
                    onClick={() => setShowAddStepModal(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une étape</span>
                  </button>

                  <button
                    onClick={() => setDeletingChecklist(activeEditorChecklist)}
                    className="p-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                    title="Supprimer la checklist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sub tabs */}
          <div className="flex items-center gap-4 px-6 border-b border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveEditorTab('etapes')}
              className={`py-3 border-b-2 transition-all ${
                activeEditorTab === 'etapes'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Étapes ({activeEditorChecklist.steps?.length || 0})
            </button>
            <button
              onClick={() => setActiveEditorTab('events')}
              className={`py-3 border-b-2 transition-all ${
                activeEditorTab === 'events'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Cultes associés ({activeEditorChecklist.eventChecklists?.length || 0})
            </button>
          </div>

          {/* Tab Content: Steps */}
          <div className="p-6">
            {activeEditorTab === 'etapes' && (
              <div className="space-y-3">
                {(!activeEditorChecklist.steps || activeEditorChecklist.steps.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Aucune étape dans cette checklist. {isLeaderOrAdmin && 'Cliquez sur "+ Ajouter une étape".'}
                  </div>
                ) : (
                  activeEditorChecklist.steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      draggable={isLeaderOrAdmin}
                      onDragStart={() => setDragStepIndex(idx)}
                      onDragOver={(e) => {
                        if (!isLeaderOrAdmin || dragStepIndex === null) return;
                        e.preventDefault();
                        if (dragOverStepIndex !== idx) setDragOverStepIndex(idx);
                      }}
                      onDragLeave={() => {
                        setDragOverStepIndex((prev) => (prev === idx ? null : prev));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragStepIndex !== null && dragStepIndex !== idx) handleMoveStep(dragStepIndex, idx);
                        setDragStepIndex(null);
                        setDragOverStepIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragStepIndex(null);
                        setDragOverStepIndex(null);
                      }}
                      className={`p-4 rounded-2xl border bg-slate-50/50 space-y-3 transition-all ${
                        dragOverStepIndex === idx && dragStepIndex !== idx
                          ? 'border-indigo-400 ring-2 ring-indigo-200'
                          : 'border-slate-200'
                      } ${dragStepIndex === idx ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          {isLeaderOrAdmin && (
                            <span
                              className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 mt-0.5 touch-none"
                              title="Glisser pour réordonner"
                            >
                              <GripVertical className="w-4 h-4" />
                            </span>
                          )}
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                            {step.description && (
                              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{step.description}</p>
                            )}
                          </div>
                        </div>

                        {isLeaderOrAdmin && (
                          <button
                            onClick={() => setDeletingStepIndex(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Supprimer cette étape"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Direct Media display */}
                      {(step.mediaUrl || step.mediaThumbnail) && (
                        <div className="pl-9">
                          {step.mediaType === 'VIDEO' && step.mediaUrl ? (
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-black max-w-md">
                              <video src={step.mediaUrl} controls className="w-full h-44 bg-black" />
                            </div>
                          ) : (step.mediaThumbnail || step.mediaUrl) ? (
                            <div className="rounded-xl overflow-hidden border border-slate-200 max-w-sm">
                              <img src={step.mediaThumbnail || step.mediaUrl || ''} alt="" className="w-full h-36 object-cover" />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Events */}
            {activeEditorTab === 'events' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800">Associer cette checklist aux cultes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {events.map((ev) => {
                    const isAssociated = activeEditorChecklist.eventChecklists?.some((ec: any) => ec.eventId === ev.id);
                    return (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{ev.title}</p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(ev.startsAt).toLocaleDateString('fr-FR')} • {ev.location}
                            </p>
                          </div>
                        </div>

                        {isLeaderOrAdmin ? (
                          isAssociated ? (
                            <button
                              onClick={() => handleDissociateEvent(ev.id)}
                              className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Associé</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAssociateEvent(ev.id)}
                              className="px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 text-xs font-bold rounded-xl"
                            >
                              Associer
                            </button>
                          )
                        ) : (
                          isAssociated && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg">
                              Associé au culte
                            </span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CRÉER UNE CHECKLIST — same form used on the pole detail page */}
      <ChecklistFormModal
        isOpen={showCreateModal}
        poleId={selectedPoleId && selectedPoleId !== 'all' ? selectedPoleId : (myPoles[0]?.id || poles[0]?.id || '')}
        poleName={poles.find((p) => p.id === (selectedPoleId && selectedPoleId !== 'all' ? selectedPoleId : (myPoles[0]?.id || poles[0]?.id || '')) )?.name}
        editingChecklist={null}
        onClose={() => setShowCreateModal(false)}
        onSaved={handleChecklistCreated}
      />

      {/* MODAL MODIFIER TITRE / DESCRIPTION */}
      {showEditInfoModal && (
        <Modal
          isOpen={showEditInfoModal}
          onClose={() => setShowEditInfoModal(false)}
          title="Modifier les informations"
          subtitle="Modifiez le titre et la description de la checklist"
          icon={<Edit2 className="w-5 h-5 text-white" />}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateChecklistInfo} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Titre de la checklist *</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditInfoModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingInfo || !editTitle.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
              >
                {savingInfo ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Add Step with direct photo/video upload */}
      {showAddStepModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900">Ajouter une étape</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Titre de l'étape *</label>
                <input
                  type="text"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  placeholder="ex: Vérifier le système de sonorisation"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description / Consignes</label>
                <textarea
                  rows={2}
                  value={newStepDesc}
                  onChange={(e) => setNewStepDesc(e.target.value)}
                  placeholder="Précisions sur la démarche à suivre..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>

              {/* Direct File Upload Zone */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  📸 / 🎥 Téléverser une photo ou vidéo (Direct)
                </label>

                {uploadingMedia ? (
                  <div className="py-4 text-center flex items-center justify-center gap-2 text-xs text-indigo-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Téléversement du fichier...</span>
                  </div>
                ) : newStepMediaUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        ✓ Fichier chargé ({newStepMediaType === 'VIDEO' ? 'Vidéo' : 'Photo'})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewStepMediaUrl('');
                          setNewStepMediaType('TEXT');
                        }}
                        className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Retirer</span>
                      </button>
                    </div>

                    <div className="max-w-md">
                      <MediaViewer
                        url={newStepMediaUrl}
                        mediaType={newStepMediaType}
                        title={newStepTitle}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Collez un lien vidéo (YouTube, Vimeo, MP4) ou téléversez..."
                        value={newStepMediaUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isVid =
                            val.includes('youtube.com') ||
                            val.includes('youtu.be') ||
                            val.includes('vimeo.com') ||
                            val.includes('loom.com') ||
                            /\.(mp4|webm|mov|m4v)$/i.test(val);
                          setNewStepMediaUrl(val);
                          setNewStepMediaType(isVid ? 'VIDEO' : val ? 'PHOTO' : 'NONE');
                        }}
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                      <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                        {uploadingMedia ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        <span>{uploadingMedia ? 'Envoi...' : 'Téléverser'}</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          disabled={uploadingMedia}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                        />
                      </label>
                    </div>

                    {/* Progress bar */}
                    {stepUploadProgress && (
                      <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-1 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                          <span>{stepUploadProgress?.statusText}</span>
                          <span>{stepUploadProgress?.percent}%</span>
                        </div>
                        <div className="w-full bg-indigo-200/70 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${stepUploadProgress?.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAddStepModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleAddStep}
                disabled={actionLoading || !newStepTitle.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {actionLoading ? 'Ajout...' : "Ajouter l'étape"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION JOLIE POUR SUPPRESSION CHECKLIST */}
      <ConfirmModal
        isOpen={Boolean(deletingChecklist)}
        onClose={() => setDeletingChecklist(null)}
        onConfirm={handleConfirmDeleteChecklist}
        title="Supprimer la checklist"
        description={`Êtes-vous sûr de vouloir supprimer définitivement la checklist "${deletingChecklist?.title}" ? Toutes les étapes et historiques associés seront effacés.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Conserver la checklist"
        variant="danger"
        loading={actionLoading}
      />

      {/* MODALE DE CONFIRMATION JOLIE POUR SUPPRESSION ÉTAPE */}
      <ConfirmModal
        isOpen={deletingStepIndex !== null}
        onClose={() => setDeletingStepIndex(null)}
        onConfirm={handleConfirmDeleteStep}
        title="Supprimer cette étape"
        description="Êtes-vous sûr de vouloir retirer cette étape du guide d'exécution opérationnel ?"
        confirmLabel="Supprimer l'étape"
        cancelLabel="Annuler"
        variant="danger"
        loading={actionLoading}
      />

      {/* Runner Modal */}
      {runningChecklist && (
        <ChecklistRunnerModal
          checklist={runningChecklist}
          currentUser={currentUser || null}
          onClose={() => setRunningChecklist(null)}
          onCompleted={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Feedback Modal */}
      {feedbackChecklist && (
        <ChecklistFeedbackModal
          checklist={feedbackChecklist}
          onClose={() => setFeedbackChecklist(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
