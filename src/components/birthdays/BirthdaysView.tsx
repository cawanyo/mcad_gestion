'use client';

import React from 'react';
import {
  Cake,
  Gift,
  Calendar,
  Sparkles,
  Users,
  Search,
  Phone,
  Send,
  Check,
  Edit3,
  RefreshCw,
  Clock,
  Heart
} from 'lucide-react';
import { User, Pole } from '@/types';
import { Avatar, Badge, StatCard, EmptyState, Modal } from '@/components/ui';
import { getCachedItem, setCachedItem, CacheTTL, invalidateCache } from '@/lib/cache';

interface BirthdaysViewProps {
  currentUser?: User | null;
  poles?: Pole[];
}

const BLESSING_PRESETS = [
  "🎂 Joyeux et béni anniversaire ! Que la grâce et la paix de Dieu t'accompagnent abondamment tout au long de cette nouvelle année.",
  "🙏 Que cette nouvelle année de vie soit richement bénie dans tous tes projets et ton engagement au sein de MCAD.",
  "✨ Très joyeux anniversaire ! Merci pour ton cœur de serviteur et ta présence précieuse dans nos équipes.",
  "🎊 Toute l'équipe de MCAD te souhaite un très bel anniversaire comblé de joie et de paix !"
];

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({
  currentUser,
  poles = []
}) => {
  const currentMonthIdx = new Date().getMonth() + 1;
  const [activeTab, setActiveTab] = React.useState<'feed' | 'calendar' | 'missing'>('feed');
  const [selectedMonth, setSelectedMonth] = React.useState<number | 'all'>(currentMonthIdx);
  const [selectedPoleFilter, setSelectedPoleFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [birthdaysData, setBirthdaysData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Wishing modal state
  const [wishingTarget, setWishingTarget] = React.useState<any | null>(null);
  const [wishMessage, setWishMessage] = React.useState<string>('');
  const [sendingWish, setSendingWish] = React.useState<boolean>(false);
  const [wishSentSuccess, setWishSentSuccess] = React.useState<boolean>(false);

  // Edit birthdate modal state
  const [editingTarget, setEditingTarget] = React.useState<any | null>(null);
  const [inputBirthDate, setInputBirthDate] = React.useState<string>('');
  const [updatingDate, setUpdatingDate] = React.useState<boolean>(false);

  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

  const fetchBirthdays = async (force: boolean = false) => {
    try {
      let url = '/api/birthdays';
      const params = new URLSearchParams();
      if (selectedPoleFilter !== 'all') params.append('poleId', selectedPoleFilter);
      if (selectedMonth !== 'all') params.append('month', String(selectedMonth));
      if (params.toString()) url += `?${params.toString()}`;

      const cacheKey = `mcad_cache_birthdays_${selectedPoleFilter}_${selectedMonth}`;
      
      // Check cache first for instant display
      if (!force) {
        const cached = getCachedItem<any>(cacheKey);
        if (cached) {
          setBirthdaysData(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBirthdaysData(data);
        setCachedItem(cacheKey, data, CacheTTL.LONG);
      }
    } catch (e) {
      console.error('Error fetching birthdays:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchBirthdays();
  }, [selectedPoleFilter, selectedMonth]);

  const handleSendWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishingTarget || !wishMessage.trim()) return;

    try {
      setSendingWish(true);
      const res = await fetch('/api/birthdays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_WISH',
          targetUserId: wishingTarget.id,
          message: wishMessage.trim(),
          senderUserId: currentUser?.id
        })
      });

      if (res.ok) {
        setWishSentSuccess(true);
        setTimeout(() => {
          setWishSentSuccess(false);
          setWishingTarget(null);
          setWishMessage('');
        }, 1800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingWish(false);
    }
  };

  const handleUpdateBirthdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget || !inputBirthDate) return;

    try {
      setUpdatingDate(true);
      const res = await fetch('/api/birthdays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_BIRTHDATE',
          targetUserId: editingTarget.id,
          birthDate: inputBirthDate
        })
      });

      if (res.ok) {
        invalidateCache('mcad_cache_birthdays');
        fetchBirthdays(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingDate(false);
    }
  };

  const birthdaysToday = birthdaysData?.birthdaysToday || [];
  const birthdaysThisWeek = birthdaysData?.birthdaysThisWeek || [];
  const upcomingBirthdays = birthdaysData?.upcomingBirthdays || [];
  const monthlyGroups = birthdaysData?.monthlyGroups || [];
  const membersWithoutBirthdate = birthdaysData?.membersWithoutBirthdate || [];
  const kpis = birthdaysData?.kpis || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Anniversaires MCAD</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800">
              {kpis.totalWithBirthdate || 0} membres
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Célébrez les membres de votre communauté et envoyez vos vœux et bénédictions.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'feed'
                ? 'bg-white text-pink-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fil des Célébrations
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'calendar'
                ? 'bg-white text-pink-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vue par Mois
          </button>
          {isLeaderOrAdmin && (
            <button
              onClick={() => setActiveTab('missing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === 'missing'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Dates manquantes</span>
              {kpis.missingCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full font-bold">
                  {kpis.missingCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 🎉 HERO CELEBRATION: BIRTHDAYS TODAY */}
      {birthdaysToday.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-pink-500 via-rose-600 to-amber-500 text-white shadow-lg shadow-pink-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
              🎂
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-100">
                Aujourd'hui en fête !
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {birthdaysToday.map((b: any) => b.name).join(', ')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {birthdaysToday.map((b: any) => (
              <button
                key={b.id}
                onClick={() => {
                  setWishingTarget(b);
                  setWishMessage(BLESSING_PRESETS[0]);
                }}
                className="px-4 py-2 bg-white text-pink-700 hover:bg-pink-50 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Souhaiter à {b.firstName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🚀 ANNIVERSAIRES DE LA SEMAINE EN COURS */}
      <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <span>Anniversaires de la semaine en cours</span>
          </h2>
          <span className="text-[11px] font-semibold text-pink-600">
            {birthdaysThisWeek.length} cette semaine
          </span>
        </div>

        {birthdaysThisWeek.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            Aucun anniversaire à célébrer cette semaine.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {birthdaysThisWeek.map((b: any) => (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between space-y-3 ${
                  b.isToday
                    ? 'border-pink-300 bg-pink-50/40 ring-1 ring-pink-400'
                    : b.daysUntil <= 2
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={b.avatar} name={b.name} size="md" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">{b.name}</p>
                      <p className="text-[11px] font-bold text-pink-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{b.dateFormatted}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      b.isToday
                        ? 'bg-pink-500 text-white animate-pulse'
                        : b.daysUntil === 1
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {b.isToday
                      ? 'Aujourd’hui 🎉'
                      : b.daysUntil === 1
                      ? 'Demain !'
                      : `Dans ${b.daysUntil}j`}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {b.phone && (
                      <>
                        <a
                          href={`tel:${b.phone}`}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                          title="Appeler"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                        <a
                          href={`https://wa.me/${b.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
                          title="WhatsApp"
                        >
                          <Send className="w-3 h-3" />
                        </a>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setWishingTarget(b);
                      setWishMessage(BLESSING_PRESETS[0]);
                    }}
                    className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Gift className="w-3 h-3" />
                    <span>Souhaiter</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Aujourd'hui"
          value={kpis.todayCount || 0}
          icon={<Cake className="w-4 h-4 text-pink-600" />}
          iconBg="bg-pink-50"
        />
        <StatCard
          label="Cette semaine"
          value={kpis.thisWeekCount || 0}
          icon={<Sparkles className="w-4 h-4 text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <StatCard
          label="Ce mois-ci"
          value={kpis.thisMonthCount || 0}
          icon={<Calendar className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Total enregistrés"
          value={kpis.totalWithBirthdate || 0}
          icon={<Users className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
      </div>

      {/* 12-MONTH HORIZONTAL FILTER BAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedMonth === 'all'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tous les mois ({kpis.totalWithBirthdate || 0})
          </button>
          {monthlyGroups.map((group: any) => {
            const isCurrent = group.monthNumber === currentMonthIdx;
            const isSelected = selectedMonth === group.monthNumber;

            return (
              <button
                key={group.monthNumber}
                onClick={() => setSelectedMonth(group.monthNumber)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-pink-600 text-white shadow-xs'
                    : isCurrent
                    ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{group.shortName || group.monthShortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isCurrent
                      ? 'bg-pink-200 text-pink-900'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {group.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENU PRINCIPAL PAR ONGLET */}
      {activeTab === 'feed' || activeTab === 'calendar' ? (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedPoleFilter}
                onChange={(e) => setSelectedPoleFilter(e.target.value)}
                className="w-full sm:w-auto p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs"
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

          {/* Monthly Groups Feed */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Cake className="w-4 h-4 animate-bounce text-pink-600" />
              <span>Chargement des anniversaires...</span>
            </div>
          ) : (
            monthlyGroups
              .filter((g: any) => selectedMonth === 'all' || g.monthNumber === selectedMonth)
              .map((group: any) => {
                const groupMembers = (group.members || []).filter((m: any) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return m.name.toLowerCase().includes(q) || (m.phone || '').toLowerCase().includes(q);
                });

                if (groupMembers.length === 0 && selectedMonth === 'all') return null;

                return (
                  <div key={group.monthNumber} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span>{group.monthName}</span>
                        <Badge variant="purple" size="sm">
                          {groupMembers.length}
                        </Badge>
                      </h3>
                      {group.monthNumber === currentMonthIdx && (
                        <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                          Mois en cours ⭐
                        </span>
                      )}
                    </div>

                    {groupMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Aucun anniversaire trouvé pour ce mois.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {groupMembers.map((b: any) => (
                          <div
                            key={b.id}
                            className={`p-3.5 bg-white rounded-2xl border transition-all hover:shadow-md space-y-3 relative ${
                              b.isToday
                                ? 'border-pink-300 ring-2 ring-pink-400/40 bg-gradient-to-b from-pink-50/40 to-white'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Avatar src={b.avatar} name={b.name} size="md" />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-extrabold text-slate-900 truncate">
                                  {b.name}
                                </h4>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {(b.poleMemberships || []).map((pm: any) => (
                                    <span
                                      key={pm.id || pm.poleId}
                                      className="text-[9px] font-bold px-1.5 py-0.2 rounded-md"
                                      style={{
                                        backgroundColor: `${pm.pole?.color || '#ec4899'}15`,
                                        color: pm.pole?.color || '#ec4899'
                                      }}
                                    >
                                      {pm.pole?.name}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                  b.isToday
                                    ? 'bg-pink-500 text-white animate-pulse'
                                    : b.daysUntil <= 7 && b.daysUntil > 0
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {b.isToday
                                  ? 'Aujourd’hui 🎉'
                                  : b.daysUntil === 1
                                  ? 'Demain'
                                  : b.daysUntil > 0 && b.daysUntil <= 30
                                  ? `Dans ${b.daysUntil}j`
                                  : b.dateFormatted}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-pink-600" />
                                <span>{b.dateFormatted}</span>
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-1">
                                {b.phone && (
                                  <>
                                    <a
                                      href={`tel:${b.phone}`}
                                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                                      title="Appeler"
                                    >
                                      <Phone className="w-3 h-3" />
                                    </a>
                                    <a
                                      href={`https://wa.me/${b.phone.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
                                      title="WhatsApp"
                                    >
                                      <Send className="w-3 h-3" />
                                    </a>
                                  </>
                                )}
                                {isLeaderOrAdmin && (
                                  <button
                                    onClick={() => {
                                      setEditingTarget(b);
                                      const bdate = new Date(b.birthDate);
                                      setInputBirthDate(bdate.toISOString().split('T')[0]);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                    title="Modifier date"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  setWishingTarget(b);
                                  setWishMessage(BLESSING_PRESETS[0]);
                                }}
                                className="px-3 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs"
                              >
                                <Gift className="w-3 h-3" />
                                <span>Souhaiter</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      ) : null}

      {/* VUE DATES MANQUANTES (Admin only) */}
      {activeTab === 'missing' && isLeaderOrAdmin && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
            <span>
              <strong>{membersWithoutBirthdate.length} membres</strong> n'ont pas encore renseigné leur date d'anniversaire.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {membersWithoutBirthdate.map((m: any) => (
              <div
                key={m.id}
                className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar src={m.avatar} name={m.name} size="md" />
                  <div>
                    <p className="font-extrabold text-slate-900">{m.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{m.phone || 'Sans numéro'}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingTarget(m);
                    setInputBirthDate('');
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Renseigner
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL SOUHAITER UN ANNIVERSAIRE */}
      {wishingTarget && (
        <Modal
          isOpen={Boolean(wishingTarget)}
          onClose={() => setWishingTarget(null)}
          title={`Souhaiter un joyeux anniversaire`}
          subtitle={`À l'attention de ${wishingTarget.name}`}
          icon={<Gift className="w-5 h-5 text-white" />}
          headerGradient="from-pink-600 to-rose-700"
          maxWidth="md"
        >
          {wishSentSuccess ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl animate-bounce">
                🎉
              </div>
              <p className="font-bold text-slate-900">Vœux transmis avec succès !</p>
              <p className="text-xs text-slate-500">{wishingTarget.name} recevra votre message de bénédiction.</p>
            </div>
          ) : (
            <form onSubmit={handleSendWish} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Sélectionner un message pré-rempli :
                </label>
                <div className="space-y-1.5">
                  {BLESSING_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setWishMessage(preset)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs leading-relaxed transition-all ${
                        wishMessage === preset
                          ? 'bg-pink-50 border-pink-300 text-pink-900 font-medium shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ou personnaliser votre message :
                </label>
                <textarea
                  rows={3}
                  value={wishMessage}
                  onChange={(e) => setWishMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                  placeholder="Écrivez un mot d'encouragement..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWishingTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sendingWish || !wishMessage.trim()}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingWish ? 'Envoi...' : 'Envoyer les vœux'}</span>
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* MODAL MODIFIER LA DATE DE NAISSANCE */}
      {editingTarget && (
        <Modal
          isOpen={Boolean(editingTarget)}
          onClose={() => setEditingTarget(null)}
          title="Date d'anniversaire"
          subtitle={`Pour ${editingTarget.name || editingTarget.firstName}`}
          icon={<Edit3 className="w-4 h-4 text-white" />}
          maxWidth="sm"
        >
          <form onSubmit={handleUpdateBirthdate} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Date de naissance :
              </label>
              <input
                type="date"
                required
                value={inputBirthDate}
                onChange={(e) => setInputBirthDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={updatingDate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
              >
                {updatingDate ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
