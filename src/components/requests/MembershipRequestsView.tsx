'use client';

import React from 'react';
import {
  UserCheck,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Phone,
  Send,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Check
} from 'lucide-react';
import { Pole, User } from '@/types';
import { Avatar, Badge, EmptyState, Toast, Modal, ConfirmModal } from '@/components/ui';

interface MembershipRequestsViewProps {
  currentUser?: User | null;
  poles: Pole[];
  onRefreshAll?: () => void;
}

export const MembershipRequestsView: React.FC<MembershipRequestsViewProps> = ({
  currentUser,
  poles = [],
  onRefreshAll
}) => {
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [selectedPoleId, setSelectedPoleId] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [rejectingRequest, setRejectingRequest] = React.useState<any | null>(null);

  const fetchRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (selectedPoleId !== 'ALL') params.set('poleId', selectedPoleId);

      const res = await fetch(`/api/membership-requests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error('Error fetching membership requests:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedPoleId]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Listen to SSE real-time events
  React.useEffect(() => {
    const eventSource = new EventSource('/api/realtime');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === 'MEMBERSHIP_REQUEST_CREATED' ||
          payload.type === 'MEMBERSHIP_REQUEST_UPDATED' ||
          payload.type === 'REFRESH_ALL'
        ) {
          fetchRequests();
        }
      } catch (e) {
        console.error(e);
      }
    };
    return () => eventSource.close();
  }, [fetchRequests]);

  const handleUpdateStatus = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessingId(requestId);
      const res = await fetch(`/api/membership-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedById: currentUser?.id
        })
      });

      if (res.ok) {
        setToast({
          message: status === 'APPROVED' ? 'Demande approuvée avec succès !' : 'Demande refusée.',
          type: status === 'APPROVED' ? 'success' : 'info'
        });
        setRejectingRequest(null);
        fetchRequests();
        if (onRefreshAll) onRefreshAll();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Erreur lors du traitement', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setToast({ message: 'Erreur réseau', type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  // Filter requests locally by search
  const filteredRequests = requests.filter((req) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.toLowerCase();
    const phone = (req.user?.phone || '').toLowerCase();
    const poleName = (req.pole?.name || '').toLowerCase();
    const motivation = (req.motivation || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || poleName.includes(q) || motivation.includes(q);
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Demandes d'adhésion</span>
            {pendingCount > 0 && (
              <Badge variant="warning" size="md">
                {pendingCount} en attente
              </Badge>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validez ou refusez les demandes des STARS souhaitant rejoindre les pôles de service.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Filters Bar: Responsive Tabs, Dropdown & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {[
              { id: 'PENDING', label: 'En attente', count: pendingCount },
              { id: 'APPROVED', label: 'Approuvées' },
              { id: 'REJECTED', label: 'Refusées' },
              { id: 'ALL', label: 'Toutes' }
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-extrabold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Pole Filter */}
            <select
              value={selectedPoleId}
              onChange={(e) => setSelectedPoleId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tous les pôles</option>
              {poles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom, téléphone, motivation..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Requests Grid / Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-medium animate-pulse">
          Chargement des demandes d'adhésion...
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-6 h-6" />}
          title="Aucune demande trouvée"
          description={
            statusFilter === 'PENDING'
              ? 'Toutes les demandes ont été traitées !'
              : 'Aucune demande ne correspond à vos filtres.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';
            const isBusy = processingId === req.id;
            const otherPoles = req.user?.poleMemberships || [];

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Pole Color Top Accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: req.pole?.color || '#4f46e5' }}
                />

                <div className="space-y-4">
                  {/* Top line: Avatar, Name, Gender, Status */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={req.user?.avatar}
                        name={`${req.user?.firstName || ''} ${req.user?.lastName || ''}`}
                        size="lg"
                      />
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm leading-tight">
                          {req.user?.firstName} {req.user?.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{req.user?.gender === 'FEMME' ? '👩 Femme' : '👨 Homme'}</span>
                          {req.user?.phone && <span>• {req.user?.phone}</span>}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isPending && (
                        <Badge variant="warning" size="sm" icon={<Clock className="w-3 h-3" />}>
                          En attente
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge variant="success" size="sm" icon={<Check className="w-3 h-3" />}>
                          Approuvée
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge variant="danger" size="sm" icon={<XCircle className="w-3 h-3" />}>
                          Refusée
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Target Pole Info Card */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Pôle demandé :</span>
                      <Badge color={req.pole?.color || '#4f46e5'} dot size="sm">
                        {req.pole?.name}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Demandé le :</span>
                      <span className="font-semibold text-slate-600">{formatDate(req.createdAt)}</span>
                    </div>
                  </div>

                  {/* Motivation Quote */}
                  {req.motivation && (
                    <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs">
                      <p className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-700 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>Motivation de la STAR</span>
                      </p>
                      <p className="text-slate-700 italic leading-relaxed">
                        "{req.motivation}"
                      </p>
                    </div>
                  )}

                  {/* Other Poles Already Joined */}
                  {otherPoles.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                        Pôles actuels ({otherPoles.length}) :
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {otherPoles.map((pm: any) => (
                          <Badge
                            key={pm.id || pm.poleId}
                            color={pm.pole?.color || '#64748b'}
                            size="xs"
                          >
                            {pm.pole?.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reviewer info if resolved */}
                  {!isPending && req.reviewedBy && (
                    <p className="text-[10px] text-slate-400 italic">
                      Traité par {req.reviewedBy.firstName} {req.reviewedBy.lastName} le{' '}
                      {formatDate(req.reviewedAt)}
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Contact Shortcuts */}
                  <div className="flex items-center gap-1.5">
                    {req.user?.phone && (
                      <>
                        <a
                          href={`tel:${req.user.phone}`}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                          title="Appeler"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${req.user.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-colors"
                          title="WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>

                  {/* Resolution Buttons */}
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRejectingRequest(req)}
                        disabled={isBusy}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                        disabled={isBusy}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1 transition-all hover:scale-105 disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{isBusy ? 'Validation...' : 'Accepter'}</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">
                      {isApproved ? 'Adhésion validée' : 'Demande classée'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Rejecting Request */}
      {rejectingRequest && (
        <ConfirmModal
          isOpen={Boolean(rejectingRequest)}
          onClose={() => setRejectingRequest(null)}
          onConfirm={() => handleUpdateStatus(rejectingRequest.id, 'REJECTED')}
          title="Refuser la demande d'adhésion"
          message={`Êtes-vous certain de vouloir refuser la demande d'adhésion de ${rejectingRequest.user?.firstName} ${rejectingRequest.user?.lastName} au pôle ${rejectingRequest.pole?.name} ?`}
          details={[
            'La STAR sera notifiée du refus',
            'Elle pourra reformuler une demande ultérieurement si nécessaire'
          ]}
          confirmText="Confirmer le refus"
          cancelText="Annuler"
          variant="warning"
          loading={processingId === rejectingRequest.id}
        />
      )}
    </div>
  );
};
