import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Calendar as CalendarIcon, Clock, ChevronRight, Layers, GraduationCap, Gift } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { theme } from '../theme';
import { User } from '../types';

interface HomeScreenProps {
  currentUser: User;
  onNavigateTab: (tab: 'accueil' | 'calendrier' | 'poles' | 'checklists' | 'formations' | 'profil') => void;
  onOpenTraining: (module: any) => void;
  onOpenUnavailability?: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ currentUser, onNavigateTab, onOpenTraining, onOpenUnavailability }) => {
  const data = useQuery(api.dashboard.get, {});
  const loading = data === undefined;
  const [refreshing, setRefreshing] = React.useState(false);

  const memberData = (data as any)?.memberData;
  const myAssignments = memberData?.myAssignments || [];
  const myPoles = memberData?.myPoles || [];
  const birthdays = (data as any)?.birthdays || [];
  const upcomingEvents = (data as any)?.upcomingEvents || [];
  const nextService = memberData?.nextService;
  const hasNoPoles = myPoles.length === 0;

  const openEventsForVolunteering = upcomingEvents.filter((ev: any) => {
    const isAssigned = (ev.assignments || []).some((a: any) => a.userId === currentUser.id);
    return !isAssigned;
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor={theme.colors.primary} />}
    >
      {/* Welcome banner */}
      <View style={[styles.banner, { backgroundColor: theme.colors.primaryDark }]}>
        <Text style={styles.bannerTitle}>Bonjour, {currentUser.firstName}</Text>
        {onOpenUnavailability && (
          <TouchableOpacity style={styles.bannerBtn} onPress={onOpenUnavailability}>
            <Clock size={14} color="#fff" />
            <Text style={styles.bannerBtnText}>Déclarer une absence</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasNoPoles && !loading && (
        <View style={styles.noPoleBanner}>
          <View style={styles.noPoleIcon}>
            <Layers size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noPoleTitle}>Rejoignez votre premier pôle</Text>
            <Text style={styles.noPoleSubtitle}>Nécessaire pour être planifié sur les cultes.</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateTab('poles')}>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Prochain service */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mon prochain service</Text>
        {loading ? (
          <Text style={styles.muted}>Chargement...</Text>
        ) : nextService ? (
          <View style={styles.serviceBox}>
            <Text style={styles.serviceTitle}>{nextService.title}</Text>
            <View style={styles.row}>
              <CalendarIcon size={14} color={theme.colors.primary} />
              <Text style={styles.serviceMeta}>{formatDate(new Date(nextService.startsAt).toISOString())}</Text>
            </View>
            <View style={styles.row}>
              <Clock size={14} color={theme.colors.primary} />
              <Text style={styles.serviceMeta}>
                {formatTime(new Date(nextService.startsAt).toISOString())} - {formatTime(new Date(nextService.endsAt).toISOString())}
              </Text>
            </View>
            <View style={styles.badgeRow}>
              {memberData?.nextAssignmentPole?.name && (
                <View style={styles.poleBadge}>
                  <Text style={styles.poleBadgeText}>{memberData.nextAssignmentPole.name}</Text>
                </View>
              )}
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{memberData?.nextAssignmentRole || 'Membre de service'}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>Vous n'êtes assigné à aucun service pour le moment.</Text>
            {!hasNoPoles && openEventsForVolunteering.length > 0 && (
              <TouchableOpacity style={styles.linkBtn} onPress={() => onNavigateTab('calendrier')}>
                <Text style={styles.linkBtnText}>Voir les cultes ouverts au volontariat →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {myAssignments.length > 1 && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.subLabel}>Autres services à venir ({myAssignments.length - 1})</Text>
            {myAssignments.slice(1).map((a: any) => (
              <View key={a._id} style={styles.otherService}>
                <Text style={styles.otherServiceTitle}>{a.event?.title}</Text>
                <Text style={styles.muted}>{a.pole?.name} · {a.roleTag || 'Membre'}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Mes pôles */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Mes pôles</Text>
          <Text style={styles.muted}>{myPoles.length} pôle(s)</Text>
        </View>
        {myPoles.length === 0 ? (
          <TouchableOpacity style={styles.emptyBox} onPress={() => onNavigateTab('poles')}>
            <Text style={styles.muted}>Rejoignez un pôle pour intégrer une équipe de service.</Text>
          </TouchableOpacity>
        ) : (
          myPoles.map((p: any) => (
            <TouchableOpacity key={p._id} style={styles.poleRow} onPress={() => onNavigateTab('poles')}>
              <View style={[styles.poleDot, { backgroundColor: p.color || theme.colors.primary }]} />
              <Text style={styles.poleRowText}>{p.name}</Text>
              <ChevronRight size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Formation banner */}
      <TouchableOpacity style={styles.formationBanner} onPress={() => onNavigateTab('formations')}>
        <GraduationCap size={22} color="#c7d2fe" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.formationTitle}>Modules de formation</Text>
          <Text style={styles.formationSubtitle}>Suivez les formations de vos pôles à votre rythme.</Text>
        </View>
        <ChevronRight size={18} color="#c7d2fe" />
      </TouchableOpacity>

      {/* Anniversaires */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Anniversaires de la semaine</Text>
        {birthdays.length === 0 ? (
          <Text style={styles.muted}>Aucun anniversaire cette semaine.</Text>
        ) : (
          birthdays.map((b: any, i: number) => (
            <View key={i} style={[styles.birthdayRow, b.isToday && styles.birthdayRowToday]}>
              {b.avatar ? (
                <Image source={{ uri: b.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Gift size={16} color={theme.colors.textMuted} />
                </View>
              )}
              <Text style={styles.poleRowText}>{b.name}</Text>
              <View style={[styles.roleBadge, b.isToday && { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.roleBadgeText, b.isToday && { color: '#fff' }]}>{b.countdownLabel}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  banner: { borderRadius: theme.borderRadius.xl, padding: 20, gap: 12 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.round },
  bannerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  noPoleBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.primaryDark, borderRadius: theme.borderRadius.xl, padding: 16 },
  noPoleIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  noPoleTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  noPoleSubtitle: { color: '#c7d2fe', fontSize: 12, marginTop: 2 },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, padding: 16, ...theme.shadow.card },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text, marginBottom: 8 },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  serviceBox: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.lg, padding: 14, gap: 6 },
  serviceTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceMeta: { fontSize: 12, color: theme.colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  poleBadge: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.round, paddingHorizontal: 10, paddingVertical: 4 },
  poleBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primaryDark },
  roleBadge: { backgroundColor: '#f1f5f9', borderRadius: theme.borderRadius.round, paddingHorizontal: 10, paddingVertical: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  emptyBox: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  linkBtn: {},
  linkBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  subLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 6 },
  otherService: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  otherServiceTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  poleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  poleDot: { width: 10, height: 10, borderRadius: 5 },
  poleRowText: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  formationBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: theme.borderRadius.xl, padding: 16 },
  formationTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  formationSubtitle: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  birthdayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  birthdayRowToday: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.md, paddingHorizontal: 8 }
});
