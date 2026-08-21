'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Send,
  Download,
  Filter,
  Search,
  AlertCircle,
  Sparkles,
  Check,
  Star,
  MessageSquare,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Bell,
  Eye,
  X,
  ThumbsUp,
  RefreshCw,
  CheckSquare
} from 'lucide-react';
import { ServiceValidation, Event, Pole, User } from '@/types';

interface ServiceValidationTrackingProps {
  events: Event[];
  poles: Pole[];
  currentUser?: User | null;
  onRefresh?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Difficile / Problématique',
  2: 'Moyen / À améliorer',
  3: 'Correct / Bon déroulement',
  4: 'Très bien / Fluide',
  5: 'Exceptionnel / Parfait'
};

const PRESET_COMMENTS = [
  "✨ Tout s'est très bien déroulé, super ambiance d'équipe.",
  "⏰ Léger décalage dans les horaires mais service bien géré.",
  "🎤 Petit souci matériel résolu rapidement pendant le culte.",
  "🙏 Équipe très réactive et unie, très bonne expérience.",
  "📋 Checklist opérationnelle suivie avec succès du début à la fin."
];

export const ServiceValidationTracking: React.FC<ServiceValidationTrackingProps> = ({
  events = [],
  poles = [],
  currentUser,
  onRefresh
}) => {
  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

  const [activeTab, setActiveTab] = React.useState<'all' | 'validated' | 'pending'>('pending');
  const [selectedEventId, setSelectedEventId] = React.useState('all');
  const [selectedPoleId, setSelectedPoleId] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [validations, setValidations] = React.useState<any[]>([]);
  const [counts, setCounts] = React.useState({ all: 0, validated: 0, pending: 0, unassigned: 0 });
  const [sentReminders, setSentReminders] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);

  // Member validation modal
  const [validatingItem, setValidatingItem] = React.useState<any | null>(null);
  const [rating, setRating] = React.useState<number>(5);
  const [comment, setComment] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Feedback detail modal
  const [viewingValidation, setViewingValidation] = React.useState<any | null>(null);

  const fetchValidations = async () => {
    try {
      setLoading(true);
      let url = `/api/service-validations?status=${activeTab}`;
      if (selectedEventId !== 'all') url += `&eventId=${selectedEventId}`;
      if (selectedPoleId !== 'all') url += `&poleId=${selectedPoleId}`;
      if (!isLeaderOrAdmin && currentUser) {
        url += `&userId=${currentUser.id}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setValidations(data.validations || []);
        setCounts(data.counts || { all: 0, validated: 0, pending: 0, unassigned: 0 });
      }
    } catch (e) {
      console.error('Error fetching validations:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchValidations();
  }, [activeTab, selectedEventId, selectedPoleId, searchQuery, isLeaderOrAdmin, currentUser?.id]);

  // Real-time SSE listener
  React.useEffect(() => {
    const eventSource = new EventSource('/api/realtime');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === 'SERVICE_VALIDATED' ||
          data.type === 'SERVICE_REMINDER_SENT' ||
          data.type === 'ASSIGNMENT_CREATED' ||
          data.type === 'INIT'
        ) {
          fetchValidations();
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Send reminder handler
  const handleSendReminder = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/service-validations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validationId: id })
      });
      if (res.ok) {
        setSentReminders((prev) => ({ ...prev, [id]: true }));
        fetchValidations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit member service validation
  const handleSubmitValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatingItem || !currentUser) return;

    if (!comment.trim()) {
      setSubmitError('Le commentaire est obligatoire pour valider votre service.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/service-validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: validatingItem.eventId,
          poleId: validatingItem.poleId,
          userId: currentUser.id,
          comment: comment.trim(),
          rating,
          checklistExecutionId: validatingItem.checklistExecutionId || undefined
        })
      });

      if (res.ok) {
        setValidatingItem(null);
        setComment('');
        setRating(5);
        fetchValidations();
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        setSubmitError(err.error || 'Erreur lors de la validation.');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Erreur de connexion avec le serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  // Validate on behalf (Leader action)
  const handleValidateOnBehalf = async (item: any) => {
    const leaderComment = prompt(
      `Valider le service au nom de ${item.user?.firstName} ${item.user?.lastName} :\nAjoutez un commentaire (ex: Validé en direct après le culte)`,
      'Validé avec succès par le responsable.'
    );
    if (!leaderComment) return;

    try {
      const res = await fetch('/api/service-validations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validationId: item.id,
          action: 'VALIDATE',
          comment: leaderComment,
          rating: 5
        })
      });
      if (res.ok) {
        fetchValidations();
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Export handler
  const handleExport = () => {
    const csvRows = [
      ['Membre', 'Téléphone', 'Culte', 'Date', 'Pôle', 'Statut', 'Note', 'Commentaire', 'Rappels'].join(',')
    ];

    validations.forEach((v) => {
      const row = [
        `"${v.user?.firstName} ${v.user?.lastName}"`,
        `"${v.user?.phone || ''}"`,
        `"${v.event?.title}"`,
        `"${new Date(v.event?.startsAt || v.createdAt).toLocaleDateString('fr-FR')}"`,
        `"${v.pole?.name}"`,
        `"${v.status === 'VALIDATED' ? 'Validé' : 'En attente'}"`,
        `"${v.rating || '-'}"`,
        `"${(v.comment || '').replace(/"/g, '""')}"`,
        `"${v.reminderCount || 0}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `validations_services_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute validation percentage
  const validationRate = counts.all > 0 ? Math.round((counts.validated / counts.all) * 100) : 100;

  // Pending validations for current user
  const myPendingValidations = validations.filter(
    (v) => v.status === 'PENDING' && v.userId === currentUser?.id
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>{isLeaderOrAdmin ? 'Suivi des Validations de Service' : 'Valider mon Service'}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {counts.validated} validé(s)
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLeaderOrAdmin
              ? 'Suivi des retours d’expérience par bénévole, rappels automatiques et contrôle qualité.'
              : 'Validez votre présence après chaque culte et transmettez votre retour d’expérience à vos responsables.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isLeaderOrAdmin && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exporter CSV</span>
            </button>
          )}

          <button
            onClick={() => fetchValidations()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Taux de validation */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Taux de validation
            </span>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{validationRate}%</span>
            <span className="text-[11px] font-semibold text-emerald-600">des services</span>
          </div>
        </div>

        {/* KPI 2: Validés */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Services validés
            </span>
            <div className="p-2 bg-indigo-50 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.validated}</span>
            <span className="text-[11px] font-semibold text-indigo-600">au total</span>
          </div>
        </div>

        {/* KPI 3: En attente */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              En attente
            </span>
            <div className="p-2 bg-amber-50 rounded-xl">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.pending}</span>
            <span className="text-[11px] font-semibold text-amber-600">à valider</span>
          </div>
        </div>

        {/* KPI 4: Total affectations */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Total affectations
            </span>
            <div className="p-2 bg-slate-50 rounded-xl">
              <Users className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{counts.all}</span>
            <span className="text-[11px] font-semibold text-slate-500">services</span>
          </div>
        </div>
      </div>

      {/* 🚀 MEMBER HERO SECTION: PENDING SERVICES TO VALIDATE */}
      {!isLeaderOrAdmin && myPendingValidations.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl text-white shadow-xl shadow-amber-600/20 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-xs">
                <Bell className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div>
                <h2 className="text-base font-extrabold">
                  {myPendingValidations.length} service(s) en attente de votre validation
                </h2>
                <p className="text-xs text-amber-100 mt-0.5">
                  Merci de confirmer votre présence et de laisser un rapide retour pour vos responsables.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {myPendingValidations.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white/95 text-slate-900 rounded-2xl shadow-sm flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.pole?.color || '#4f46e5' }}
                    />
                    <h4 className="text-xs font-bold text-slate-900">{item.event?.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>
                      {new Date(item.event?.startsAt || item.createdAt).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-700">{item.pole?.name}</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setValidatingItem(item);
                    setComment('');
                    setRating(5);
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-105 flex-shrink-0 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valider</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>En attente ({counts.pending})</span>
          </button>

          <button
            onClick={() => setActiveTab('validated')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'validated'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Validés ({counts.validated})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-indigo-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({counts.all})
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher membre, culte..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          {/* Event Filter */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="all">Tous les cultes</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>

          {/* Pole Filter */}
          <select
            value={selectedPoleId}
            onChange={(e) => setSelectedPoleId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="all">Tous les pôles</option>
            {poles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Validation Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Chargement des validations...</span>
          </div>
        ) : validations.length === 0 ? (
          <div className="py-16 text-center space-y-3 p-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Aucune validation trouvée</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {activeTab === 'pending'
                  ? 'Félicitations ! Aucun service n’est en attente de validation pour ces critères.'
                  : 'Aucun enregistrement ne correspond aux filtres sélectionnés.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Membre</th>
                  <th className="py-3.5 px-4">Culte & Date</th>
                  <th className="py-3.5 px-4">Pôle</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Note & Retour d'expérience</th>
                  <th className="py-3.5 px-4">Rappels</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validations.map((item) => {
                  const isOwner = currentUser?.id === item.userId;
                  const isValidated = item.status === 'VALIDATED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Membre */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.user?.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt=""
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900 leading-tight">
                              {item.user?.firstName} {item.user?.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.user?.phone || 'Bénévole'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Culte */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{item.event?.title}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {new Date(item.event?.startsAt || item.createdAt).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </p>
                        </div>
                      </td>

                      {/* Pôle */}
                      <td className="py-3.5 px-4">
                        <span
                          className="px-2.5 py-1 rounded-xl font-extrabold text-[11px] inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: `${item.pole?.color || '#4f46e5'}15`,
                            color: item.pole?.color || '#4f46e5'
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: item.pole?.color || '#4f46e5' }}
                          />
                          <span>{item.pole?.name}</span>
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                            isValidated
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isValidated ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Validé</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>En attente</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Note & Commentaire */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {isValidated ? (
                          <div className="space-y-1">
                            {/* Stars */}
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= (item.rating || 5) ? 'fill-current' : 'text-slate-200'
                                  }`}
                                />
                              ))}
                              <span className="text-[10px] font-bold text-slate-500 ml-1">
                                ({item.rating || 5}/5)
                              </span>
                            </div>

                            {/* Comment */}
                            <p
                              onClick={() => setViewingValidation(item)}
                              className="text-slate-700 truncate text-[11px] italic cursor-pointer hover:text-indigo-600 transition-colors"
                              title="Cliquez pour lire en entier"
                            >
                              "{item.comment}"
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Non encore renseigné
                          </span>
                        )}
                      </td>

                      {/* Rappels */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {item.reminderCount > 0 ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[10px]">
                            {item.reminderCount} rappel(s)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {!isValidated ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Member can validate their own service */}
                            {isOwner && (
                              <button
                                onClick={() => {
                                  setValidatingItem(item);
                                  setComment('');
                                  setRating(5);
                                }}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-105"
                              >
                                Valider mon service
                              </button>
                            )}

                            {/* Leader can send reminder or validate on behalf */}
                            {isLeaderOrAdmin && (
                              <>
                                <button
                                  onClick={() =>
                                    handleSendReminder(
                                      item.id,
                                      `${item.user?.firstName} ${item.user?.lastName}`
                                    )
                                  }
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    sentReminders[item.id]
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                  }`}
                                  title="Envoyer un rappel automatique par notification"
                                >
                                  {sentReminders[item.id] ? '✓ Rappelé' : 'Relancer'}
                                </button>

                                <button
                                  onClick={() => handleValidateOnBehalf(item)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Valider au nom du membre"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setViewingValidation(item)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Voir le retour</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Total : {validations.length} enregistrement(s) affiché(s)</span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Moteur d’audit et de rappels connecté en temps réel (SSE)</span>
          </span>
        </div>
      </div>

      {/* ================= MODAL DE VALIDATION MEMBRE ================= */}
      {validatingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold">Valider mon service</h2>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    {validatingItem.event?.title} • {validatingItem.pole?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setValidatingItem(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitValidation} className="p-6 space-y-4">
              {submitError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Star Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Comment évaluez-vous le déroulement de votre service ? *
                </label>
                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          s <= rating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-200 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-extrabold text-amber-800 ml-2 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    {RATING_LABELS[rating]}
                  </span>
                </div>
              </div>

              {/* Preset Comment Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Puces rapides de retour :
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COMMENTS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setComment(preset)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 transition-all text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Votre commentaire / retour d'expérience *
                </label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Expliquez brièvement comment s'est passé votre service, les points positifs et d'éventuels besoins..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setValidatingItem(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Validation en cours...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmer et valider mon service</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAILS DU RETOUR ================= */}
      {viewingValidation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold">Retour d'expérience</h2>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    {viewingValidation.event?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingValidation(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Member Info */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <img
                  src={
                    viewingValidation.user?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt=""
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200"
                />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">
                    {viewingValidation.user?.firstName} {viewingValidation.user?.lastName}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Pôle {viewingValidation.pole?.name} • Validé le{' '}
                    {viewingValidation.validatedAt
                      ? new Date(viewingValidation.validatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Évaluation :</span>
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= (viewingValidation.rating || 5)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-extrabold text-amber-900 ml-1">
                    ({viewingValidation.rating || 5}/5)
                  </span>
                </div>
              </div>

              {/* Comment text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Commentaire du membre :
                </label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                  "{viewingValidation.comment || 'Aucun commentaire textuel renseigné.'}"
                </div>
              </div>

              {/* Close button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingValidation(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
