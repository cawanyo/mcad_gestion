'use client';

import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Star,
  Layers,
  Phone,
  Send,
  Shield,
  Crown,
  KeyRound,
  Trash2,
  AlertCircle,
  RefreshCw,
  Award,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { User, Pole, UserRole } from '@/types';
import { Avatar, Badge, Modal, ConfirmModal, Toast, ToastState } from '@/components/ui';
import { convexErrorMessage } from '@/lib/convexErrors';

interface MemberDetailViewProps {
  memberId: string;
  currentUser: User | null;
  poles: Pole[];
  onBack: () => void;
  onRefreshAll?: () => void;
}

const ROLES_CONFIG: Record<
  string,
  { label: string; bg: string; description: string; badgeColor: string }
> = {
  MEMBER: {
    label: 'Membre de service',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeColor: '#64748b',
    description: 'Accès au calendrier, exécution des checklists, validation de ses services et déclarations d\'indisponibilité.'
  },
  POLE_LEADER: {
    label: 'Responsable de Pôle',
    bg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeColor: '#3b82f6',
    description: 'Gestion des STARS de son pôle, assignations aux cultes, modèles de checklists et suivi des validations.'
  },
  CALENDAR_MANAGER: {
    label: 'Gestionnaire Calendrier',
    bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeColor: '#6366f1',
    description: 'Création, modification et planification des cultes et événements récurrents.'
  },
  DEPARTMENT_LEADER: {
    label: 'Responsable Département',
    bg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeColor: '#a855f7',
    description: 'Supervision globale de tous les pôles, gestion des membres, attribution des rôles et statistiques complètes.'
  },
  SUPER_ADMIN: {
    label: 'Administrateur',
    bg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeColor: '#e11d48',
    description: 'Accès administrateur complet sur l\'ensemble des modules et configurations système.'
  }
};

export const MemberDetailView: React.FC<MemberDetailViewProps> = ({
  memberId,
  currentUser,
  poles,
  onBack,
  onRefreshAll
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState(currentYear);
  const [toast, setToast] = React.useState<ToastState | null>(null);

  // Modals
  const [showRoleModal, setShowRoleModal] = React.useState(false);
  const [selectedNewRole, setSelectedNewRole] = React.useState<UserRole>('MEMBER');
  const [savingRole, setSavingRole] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Queries
  const membersRaw = useQuery(api.members.list, {});
  const member = React.useMemo(() => {
    return (membersRaw || []).find((m: any) => m._id === memberId);
  }, [membersRaw, memberId]);

  const statsData = useQuery(api.stats.get, {
    userId: memberId as Id<'users'>,
    year: selectedYear
  });

  const updateRoleMutation = useMutation(api.members.updateRole);
  const removeMemberMutation = useMutation(api.members.remove);

  const isDeptLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DEPARTMENT_LEADER';
  const isSelf = currentUser?.id === memberId;

  const effectiveRole =
    member?.role === 'MEMBER' && (member?.poleLeaderships?.length ?? 0) > 0
      ? 'POLE_LEADER'
      : member?.role || 'MEMBER';
  const roleConfig = ROLES_CONFIG[effectiveRole] || ROLES_CONFIG.MEMBER;

  // Monthly stats helper
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const servicesThisMonth = statsData?.monthlyStats?.[currentMonthIdx]?.count || 0;
  const currentMonthName = statsData?.monthlyStats?.[currentMonthIdx]?.month || 'Mois en cours';

  const calculateAge = (timestamp?: number) => {
    if (!timestamp) return null;
    const bdate = new Date(timestamp);
    if (isNaN(bdate.getTime())) return null;
    return now.getFullYear() - bdate.getFullYear();
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    try {
      setSavingRole(true);
      await updateRoleMutation({
        userId: member._id as Id<'users'>,
        role: selectedNewRole
      });
      setToast({ message: `Rôle mis à jour en "${ROLES_CONFIG[selectedNewRole]?.label || selectedNewRole}"`, type: 'success' });
      setShowRoleModal(false);
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      setToast({ message: convexErrorMessage(err, 'Erreur lors de la mise à jour du rôle'), type: 'error' });
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!member) return;
    try {
      setIsDeleting(true);
      await removeMemberMutation({ userId: member._id as Id<'users'> });
      setToast({ message: `${member.firstName} ${member.lastName} a été supprimé`, type: 'success' });
      setShowDeleteModal(false);
      if (onRefreshAll) onRefreshAll();
      setTimeout(onBack, 800);
    } catch (err) {
      setToast({ message: convexErrorMessage(err, 'Erreur lors de la suppression'), type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!member) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste des membres</span>
        </button>
        <div className="py-16 text-slate-400 text-xs">Chargement des informations du membre...</div>
      </div>
    );
  }

  const age = calculateAge(member.birthDate);
  const birthDateFormatted = member.birthDate
    ? new Date(member.birthDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      {/* Toast Notification */}
      {toast && (
        <Toast
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Bar with Back Button and Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl shadow-xs transition-all hover:scale-105 self-start"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-600" />
          <span>Retour aux membres</span>
        </button>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <label className="text-xs font-bold text-slate-500">Année d'analyse :</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
              <option key={yr} value={yr}>
                Année {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= PROFIL DU MEMBRE ================= */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <Avatar
              src={member.avatar}
              name={`${member.firstName} ${member.lastName}`}
              size="xl"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {member.firstName} {member.lastName}
                </h1>
                {isSelf && (
                  <Badge variant="primary" size="sm">
                    Moi
                  </Badge>
                )}
                <Badge variant="success" size="sm">
                  {member.status === 'ACTIVE' ? 'Actif' : member.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black border inline-flex items-center gap-1.5 ${roleConfig.bg}`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{roleConfig.label}</span>
                </span>

                {member.gender && (
                  <span className="text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-50 rounded-xl border border-slate-100">
                    {member.gender === 'FEMME' ? '👩 Femme' : '👨 Homme'}
                  </span>
                )}

                {birthDateFormatted && (
                  <span className="text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-50 rounded-xl border border-slate-100">
                    🎂 {birthDateFormatted} {age ? `(${age} ans)` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons (Change Role / Delete) */}
          {isDeptLeaderOrAdmin && (
            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSelectedNewRole(member.role as UserRole);
                  setShowRoleModal(true);
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Modifier le rôle</span>
              </button>

              {!isSelf && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all shadow-xs"
                  title="Supprimer définitivement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contact info and Poles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          {/* Contact Bar */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Coordonnées
            </h3>
            {member.phone ? (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${member.phone}`}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{member.phone}</span>
                </a>
                <a
                  href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
              </div>
            ) : (
              <p className="text-slate-400 italic">Aucun numéro de téléphone enregistré</p>
            )}
          </div>

          {/* Affiliation aux Pôles */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Pôles d'appartenance
            </h3>
            {member.poleMemberships?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {member.poleMemberships.map((pm: any) => {
                  const isLeaderOfThisPole = member.poleLeaderships?.some(
                    (pl: any) => pl.poleId === pm.poleId
                  );
                  return (
                    <span
                      key={pm._id || pm.poleId}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border"
                      style={{
                        backgroundColor: `${pm.pole?.color || '#4f46e5'}15`,
                        borderColor: `${pm.pole?.color || '#4f46e5'}30`,
                        color: pm.pole?.color || '#4f46e5'
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: pm.pole?.color || '#4f46e5' }}
                      />
                      <span>{pm.pole?.name}</span>
                      {isLeaderOfThisPole && (
                        <span title="Responsable de ce pôle">
                          <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic">N'appartient à aucun pôle pour l'instant</p>
            )}
          </div>
        </div>
      </div>

      {/* ================= STATISTIQUES DU MEMBRE ================= */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Statistiques & Assiduité aux Services</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Exercice {selectedYear}
          </span>
        </div>

        {/* 4 KPIs Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Services ce mois-ci */}
          <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Mois en cours</span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {servicesThisMonth}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              service(s) en {currentMonthName}
            </p>
          </div>

          {/* 2. Services cette année */}
          <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Année {selectedYear}</span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
              {statsData?.kpis?.totalServicesYear || 0}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              services réalisés sur l'année
            </p>
          </div>

          {/* 3. Total historique */}
          <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total historique</span>
              <span className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                <Award className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {statsData?.kpis?.totalServicesAllTime || 0}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              depuis son inscription
            </p>
          </div>

          {/* 4. Taux de validation & Note */}
          <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Taux de validation</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {statsData?.kpis?.validationRate ?? 100}%
            </div>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Note moyenne : {statsData?.kpis?.averageRating || 5.0}/5</span>
            </p>
          </div>
        </div>

        {/* Monthly Activity Graph */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Évolution mensuelle des services ({selectedYear})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nombre d'engagements assurés par mois
              </p>
            </div>
            <Badge variant="primary" size="md">
              {statsData?.kpis?.totalServicesYear || 0} services
            </Badge>
          </div>

          <div className="pt-4 pb-1 overflow-x-auto">
            <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-40 min-w-[320px]">
              {statsData?.monthlyStats?.map((m: any, idx: number) => {
                const max = Math.max(...(statsData.monthlyStats || []).map((item: any) => item.count || 0), 1);
                const heightPercent = m.count > 0 ? Math.max((m.count / max) * 100, 16) : 8;
                const isCurrentMonth = idx === currentMonthIdx && selectedYear === currentYear;

                return (
                  <div key={m.monthNumber} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                      {m.count > 0 ? m.count : ''}
                    </span>
                    <div
                      className={`w-full max-w-[28px] rounded-xl transition-all duration-300 ${
                        isCurrentMonth
                          ? 'bg-indigo-600 ring-2 ring-indigo-400/50 shadow-md shadow-indigo-600/30'
                          : m.count > 0
                          ? 'bg-gradient-to-t from-indigo-500 to-indigo-400'
                          : 'bg-slate-100'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${m.month} : ${m.count} service(s)`}
                    />
                    <span
                      className={`text-[10px] font-semibold ${
                        isCurrentMonth ? 'text-indigo-600 font-extrabold' : 'text-slate-500'
                      }`}
                    >
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Breakdown by Pole & Top Roles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Répartition par pôle */}
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Services par pôle d'activité</span>
            </h3>

            {(!statsData?.poleBreakdown || statsData.poleBreakdown.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Aucun service enregistré sur les pôles pour l'année {selectedYear}.
              </p>
            ) : (
              <div className="space-y-3 pt-1">
                {statsData.poleBreakdown.map((p: any) => (
                  <div key={p.poleId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span>{p.name}</span>
                      </span>
                      <span className="text-slate-500 font-mono">
                        {p.count} service(s) ({p.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rôles assurés */}
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Rôles & Responsabilités exercés</span>
            </h3>

            {(!statsData?.topRoles || statsData.topRoles.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Aucune mission spécifique enregistrée pour l'année {selectedYear}.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {statsData.topRoles.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between"
                  >
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{r.role}</span>
                    </span>
                    <Badge variant="primary" size="sm">
                      {r.count} fois
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Derniers cultes et services */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Derniers services réalisés ({selectedYear})</span>
          </h3>

          {(!statsData?.recentServices || statsData.recentServices.length === 0) ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              Aucun service récent n'a été trouvé pour cette période.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {statsData.recentServices.map((svc: any) => (
                <div key={svc._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-slate-900">{svc.eventTitle || 'Culte'}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-medium">
                        {svc.eventDate
                          ? new Date(svc.eventDate).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short'
                            })
                          : 'Date non renseignée'}
                      </span>
                      <span>•</span>
                      <span className="text-indigo-600 font-semibold">{svc.roleTag || 'STAR Volontaire'}</span>
                    </p>
                  </div>

                  {svc.poleName && (
                    <span
                      className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold text-white"
                      style={{ backgroundColor: svc.poleColor || '#4f46e5' }}
                    >
                      {svc.poleName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL MODIFIER LE ROLE ================= */}
      {showRoleModal && (
        <Modal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          title="Modifier le rôle et les autorisations"
          subtitle={`${member.firstName} ${member.lastName}`}
          icon={<Shield className="w-5 h-5 text-white" />}
          headerGradient="from-indigo-600 to-purple-700"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveRole} className="space-y-4">
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Sélectionnez le nouveau niveau d'accès pour ce membre. Les modifications prennent effet immédiatement.
            </p>

            <div className="space-y-2">
              {Object.entries(ROLES_CONFIG).map(([roleKey, config]) => {
                const isSelected = selectedNewRole === roleKey;
                return (
                  <label
                    key={roleKey}
                    onClick={() => setSelectedNewRole(roleKey as UserRole)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="memberRoleDetail"
                      value={roleKey}
                      checked={isSelected}
                      onChange={() => setSelectedNewRole(roleKey as UserRole)}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{config.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${config.bg}`}>
                          {roleKey}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{config.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingRole}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {savingRole ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                <span>Enregistrer le rôle</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Suppression */}
      {showDeleteModal && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteMember}
          title="Supprimer définitivement ce membre ?"
          message={`Êtes-vous sûr de vouloir supprimer ${member.firstName} ${member.lastName} ? Toutes ses affectations, validations et accès seront définitivement effacés.`}
          confirmText={isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          variant="danger"
          loading={isDeleting}
        />
      )}
    </div>
  );
};
