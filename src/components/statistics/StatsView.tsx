'use client';

import React from 'react';
import {
  BarChart3,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  TrendingUp,
  Award,
  RefreshCw,
  Star
} from 'lucide-react';
import { User, Pole } from '@/types';
import { StatCard, Badge, Avatar, EmptyState } from '@/components/ui';

interface StatsViewProps {
  currentUser: User | null;
  poles: Pole[];
}

export const StatsView: React.FC<StatsViewProps> = ({
  currentUser,
  poles = []
}) => {
  const isLeaderOrAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'DEPARTMENT_LEADER' ||
    currentUser?.role === 'POLE_LEADER' ||
    currentUser?.role === 'CALENDAR_MANAGER';

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear);
  const [selectedPoleId, setSelectedPoleId] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'personal' | 'department'>(
    isLeaderOrAdmin ? 'department' : 'personal'
  );

  const [statsData, setStatsData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      let url = `/api/stats?year=${selectedYear}`;
      if (selectedPoleId !== 'all') url += `&poleId=${selectedPoleId}`;
      if (viewMode === 'personal' && currentUser) {
        url += `&userId=${currentUser.id}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (e) {
      console.error('Error fetching statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, [selectedYear, selectedPoleId, viewMode, currentUser?.id]);

  const getMonthlyMax = (arr: any[] = [], key: string = 'count') => {
    return Math.max(...arr.map((item) => item[key] || 0), 1);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {viewMode === 'personal' ? 'Mes Statistiques de Service' : 'Statistiques & Pilotage'}
            </h1>
            <p className="text-xs text-slate-500">
              {viewMode === 'personal'
                ? 'Bilan annuel de vos participations, régularité et engagement.'
                : 'Indicateurs clés du département, répartition des effectifs et assiduité.'}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {isLeaderOrAdmin && (
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setViewMode('department')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'department'
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Département
              </button>
              <button
                onClick={() => setViewMode('personal')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'personal'
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mon Bilan
              </button>
            </div>
          )}

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
              <option key={yr} value={yr}>
                Année {yr}
              </option>
            ))}
          </select>

          {/* Pole Selector */}
          <select
            value={selectedPoleId}
            onChange={(e) => setSelectedPoleId(e.target.value)}
            className="p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs"
          >
            <option value="all">Tous les pôles</option>
            {poles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchStats}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 shadow-xs transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Calcul des statistiques en cours...</span>
        </div>
      ) : !statsData ? (
        <EmptyState
          icon={<BarChart3 className="w-6 h-6" />}
          title="Aucune donnée disponible"
          description="Les données statistiques apparaîtront au fur et à mesure des services."
        />
      ) : viewMode === 'personal' ? (
        /* ========================================================= */
        /* 1. VUE MEMBRE                                             */
        /* ========================================================= */
        <div className="space-y-5">
          {/* Member KPIs Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={`Services en ${selectedYear}`}
              value={statsData.kpis?.totalServicesYear || 0}
              subValue="services"
              valueColor="text-slate-900"
              icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
            />
            <StatCard
              label="Total historique"
              value={statsData.kpis?.totalServicesAllTime || 0}
              subValue="toutes années"
              valueColor="text-slate-900"
              icon={<Calendar className="w-4 h-4 text-slate-600" />}
              iconBg="bg-slate-100"
            />
            <StatCard
              label="Taux de validation"
              value={`${statsData.kpis?.validationRate || 100}%`}
              subValue="assiduité"
              valueColor="text-emerald-600"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
            />
            <StatCard
              label="Satisfaction moyenne"
              value={`${statsData.kpis?.averageRating || 5.0} / 5`}
              subValue="étoiles"
              valueColor="text-amber-600"
              icon={<Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
              iconBg="bg-amber-50"
            />
          </div>

          {/* Monthly Service Bar Chart */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Services par mois en {selectedYear}
              </h3>
              <Badge variant="primary" size="md">
                Total : {statsData.kpis?.totalServicesYear || 0}
              </Badge>
            </div>

            <div className="pt-4 pb-1 overflow-x-auto">
              <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-36 min-w-[280px]">
                {statsData.monthlyStats?.map((m: any) => {
                  const max = getMonthlyMax(statsData.monthlyStats, 'count');
                  const heightPercent = m.count > 0 ? Math.max((m.count / max) * 100, 15) : 6;

                  return (
                    <div key={m.monthNumber} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-bold text-slate-700">
                        {m.count > 0 ? m.count : ''}
                      </span>
                      <div
                        className={`w-full max-w-[28px] rounded-xl transition-all duration-300 ${
                          m.count > 0
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-500 shadow-xs'
                            : 'bg-slate-100'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] font-semibold text-slate-500">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Breakdown by Pole & Top Roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pole Breakdown */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Répartition par Pôle
              </h3>
              {statsData.poleBreakdown?.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">Aucun service enregistré en {selectedYear}.</p>
              ) : (
                <div className="space-y-2.5">
                  {statsData.poleBreakdown?.map((p: any) => (
                    <div key={p.poleId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-800">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span>{p.name}</span>
                        </span>
                        <span className="text-slate-600">
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

            {/* Top Roles */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Postes & Rôles fréquents
              </h3>
              {statsData.topRoles?.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">Aucun poste spécifique renseigné.</p>
              ) : (
                <div className="space-y-2">
                  {statsData.topRoles?.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-800">{r.role}</span>
                      <Badge variant="primary" size="sm">
                        {r.count} fois
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. VUE RESPONSABLE                                        */
        /* ========================================================= */
        <div className="space-y-5">
          {/* Leader Operational KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Effectif actif"
              value={statsData.kpis?.totalMembers || 0}
              subValue="bénévoles"
              icon={<Users className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
            />
            <StatCard
              label="Cultes / Événements"
              value={statsData.kpis?.totalEvents || 0}
              subValue={`en ${selectedYear}`}
              icon={<Calendar className="w-4 h-4 text-purple-600" />}
              iconBg="bg-purple-50"
            />
            <StatCard
              label="Mobilisations totales"
              value={statsData.kpis?.totalAssignmentsCount || 0}
              subValue="affectations"
              icon={<Layers className="w-4 h-4 text-blue-600" />}
              iconBg="bg-blue-50"
            />
            <StatCard
              label="Moyenne / culte"
              value={statsData.kpis?.avgVolunteersPerEvent || 0}
              subValue="bénévoles / culte"
              valueColor="text-emerald-600"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
            />
          </div>

          {/* DÉMOGRAPHIE (GENRE & TRANCHES D'ÂGE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Répartition par Genre (Sexe) */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Répartition par Sexe
                </h3>
                <span className="text-xs text-slate-400 font-bold">
                  {statsData.kpis?.totalMembers || 0} membres
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${statsData.demographics?.gender?.menPercentage || 50}%` }}
                    title={`Hommes: ${statsData.demographics?.gender?.menCount}`}
                  />
                  <div
                    className="bg-pink-500 h-full transition-all duration-500"
                    style={{ width: `${statsData.demographics?.gender?.womenPercentage || 50}%` }}
                    title={`Femmes: ${statsData.demographics?.gender?.womenCount}`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="flex items-center gap-1.5 font-bold text-indigo-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span>Hommes : {statsData.demographics?.gender?.menCount || 0} ({statsData.demographics?.gender?.menPercentage || 0}%)</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-pink-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                    <span>Femmes : {statsData.demographics?.gender?.womenCount || 0} ({statsData.demographics?.gender?.womenPercentage || 0}%)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Répartition par Tranches d'Âge */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Répartition par Tranches d'Âge
              </h3>

              <div className="space-y-2">
                {statsData.demographics?.ageGroups?.map((group: any) => (
                  <div key={group.key} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">{group.label}</span>
                      <span className="text-slate-900">
                        {group.count} membre(s) ({group.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${group.percentage}%`, backgroundColor: group.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ÉVOLUTION MENSUELLE DES MOBILISATIONS */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Mobilisations mensuelles en {selectedYear}
              </h3>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1 text-indigo-700">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>Bénévoles mobilisés</span>
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span>Cultes</span>
                </span>
              </div>
            </div>

            <div className="pt-4 pb-1 overflow-x-auto">
              <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-36 min-w-[280px]">
                {statsData.monthlyEvolution?.map((m: any) => {
                  const max = getMonthlyMax(statsData.monthlyEvolution, 'assignments');
                  const heightPercent = m.assignments > 0 ? Math.max((m.assignments / max) * 100, 15) : 6;

                  return (
                    <div key={m.monthNumber} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-bold text-slate-700">
                        {m.assignments > 0 ? m.assignments : ''}
                      </span>
                      <div
                        className={`w-full max-w-[28px] rounded-xl transition-all duration-300 ${
                          m.assignments > 0
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-500 shadow-xs'
                            : 'bg-slate-100'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] font-semibold text-slate-500">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TOP BÉNÉVOLES LES PLUS ENGAGÉS */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Bénévoles les plus engagés en {selectedYear}</span>
            </h3>

            {statsData.topVolunteers?.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">Aucune affectation enregistrée en {selectedYear}.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {statsData.topVolunteers?.map((v: any, idx: number) => (
                  <div
                    key={v.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5 text-xs shadow-xs"
                  >
                    <div className="relative">
                      <Avatar src={v.avatar} name={v.name} size="md" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-amber-950 font-black text-[9px] flex items-center justify-center shadow-xs">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 truncate">{v.name}</p>
                      <p className="text-[10px] font-bold text-indigo-700">{v.servicesCount} service(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
