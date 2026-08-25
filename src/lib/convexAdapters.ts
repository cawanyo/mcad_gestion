// Convex documents use `_id`/numeric timestamps; the rest of the app's
// components (calendar, dashboard, poles UI not yet migrated) are written
// against the `@/types` shapes (`id: string`, ISO date strings). Rather than
// touch every component that reads `.id`/`new Date(x.startsAt)`, these
// adapters translate Convex query results into those existing shapes at the
// point they're consumed, so migrated pages keep working with unmigrated
// sibling components/types without a repo-wide rename.
import type { Event, Pole, User, Assignment, EventRequirement, Checklist, ChecklistStep } from '@/types';

const iso = (ms: number | null | undefined): string => (ms ? new Date(ms).toISOString() : '');

export function adaptUserCard(u: any): User {
  if (!u) return u;
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone ?? null,
    gender: u.gender ?? null,
    birthDate: u.birthDate ? iso(u.birthDate) : null,
    avatar: u.avatar ?? null,
    role: u.role,
    status: u.status ?? 'ACTIVE',
    departmentId: u.departmentId ?? null,
  } as User;
}

export function adaptPole(p: any): Pole {
  if (!p) return p;
  return {
    id: p._id,
    name: p.name,
    description: p.description ?? null,
    color: p.color,
    icon: p.icon,
    orderIndex: p.orderIndex,
    status: p.status,
    membersCount: p.membersCount,
    leadersCount: p.leadersCount,
    leaders: (p.leaders || []).map((l: any) => ({
      id: l._id,
      user: adaptUserCard(l.user),
      roleTitle: l.roleTitle,
    })),
  } as Pole;
}

export function adaptRequirement(r: any): EventRequirement {
  if (!r) return r;
  return {
    id: r._id,
    eventId: r.eventId,
    poleId: r.poleId,
    pole: adaptPole(r.pole),
    requiredCount: r.requiredCount,
    notes: r.notes ?? null,
    roleExpected: r.roleExpected ?? null,
  } as EventRequirement;
}

export function adaptAssignment(a: any): Assignment {
  if (!a) return a;
  return {
    id: a._id,
    eventId: a.eventId,
    poleId: a.poleId,
    pole: adaptPole(a.pole),
    userId: a.userId,
    user: adaptUserCard(a.user),
    roleTag: a.roleTag ?? null,
    status: a.status,
    assignedById: a.assignedById ?? null,
    createdAt: iso(a._creationTime),
  } as Assignment;
}

export function adaptChecklistStep(s: any): ChecklistStep {
  if (!s) return s;
  return {
    id: s._id,
    checklistId: s.checklistId,
    orderIndex: s.orderIndex,
    title: s.title,
    description: s.description ?? null,
    details: s.details ?? null,
    mediaType: s.mediaType,
    mediaUrl: s.mediaUrl ?? null,
    mediaThumbnail: s.mediaThumbnail ?? null,
    isRequired: s.isRequired,
  } as ChecklistStep;
}

export function adaptChecklist(c: any): Checklist {
  if (!c) return c;
  return {
    id: c._id,
    poleId: c.poleId,
    pole: c.pole ? adaptPole(c.pole) : undefined,
    title: c.title,
    description: c.description ?? null,
    status: c.status,
    orderIndex: c.orderIndex,
    steps: (c.steps || []).map(adaptChecklistStep),
    eventChecklists: (c.eventChecklists || []).map((ec: any) => ({
      eventId: ec.eventId,
      event: ec.event ? adaptEvent(ec.event) : ec.event,
    })),
  } as Checklist;
}

export function adaptEvent(e: any): Event {
  if (!e) return e;
  return {
    id: e._id,
    title: e.title,
    description: e.description ?? null,
    startsAt: iso(e.startsAt),
    endsAt: iso(e.endsAt),
    location: e.location,
    status: e.status,
    coverImage: e.coverImage ?? null,
    organizerPoleId: e.organizerPoleId ?? null,
    organizerPole: e.organizerPole ? adaptPole(e.organizerPole) : null,
    requirements: (e.requirements || []).map(adaptRequirement),
    assignments: (e.assignments || []).map(adaptAssignment),
    eventChecklists: (e.eventChecklists || []).map((ec: any) => ({ checklist: adaptChecklist(ec.checklist) })),
  } as Event;
}

function adaptMembershipRequestLite(r: any) {
  if (!r) return r;
  return {
    id: r._id,
    userId: r.userId,
    user: adaptUserCard(r.user),
    poleId: r.poleId,
    pole: adaptPole(r.pole),
    status: r.status,
    motivation: r.motivation ?? null,
    createdAt: iso(r._creationTime),
  };
}

// Adapts convex/poles.ts's `get` (single-pole detail) query result — same
// _id-to-id treatment as the rest of this file, applied to every nested
// level PoleDetailView reads (leaders/memberships/membershipRequests/
// eventRequirements/checklists). Foreign-key fields (userId/poleId/eventId/
// checklistId) are already valid Convex id strings and compare directly
// against `currentUser.id`, so only `_id` needs renaming, not those.
export function adaptPoleDetail(raw: any) {
  if (!raw) return raw;
  const adaptCard = (u: any) => (u ? { ...u, id: u._id } : u);

  return {
    ...raw,
    id: raw._id,
    leaders: (raw.leaders || []).map((l: any) => ({ ...l, id: l._id, user: adaptCard(l.user) })),
    memberships: (raw.memberships || []).map((m: any) => ({ ...m, id: m._id, user: adaptCard(m.user) })),
    membershipRequests: (raw.membershipRequests || []).map((r: any) => ({ ...r, id: r._id, user: adaptCard(r.user) })),
    checklists: (raw.checklists || []).map((c: any) => ({
      ...c,
      id: c._id,
      steps: (c.steps || []).map((s: any) => ({ ...s, id: s._id })),
      eventChecklists: (c.eventChecklists || []).map((ec: any) => ({ ...ec, id: ec._id })),
    })),
    eventRequirements: (raw.eventRequirements || []).map((r: any) => ({
      ...r,
      id: r._id,
      event: r.event
        ? {
            ...r.event,
            id: r.event._id,
            assignments: (r.event.assignments || []).map((a: any) => ({ ...a, id: a._id, user: adaptCard(a.user) })),
          }
        : r.event,
    })),
  };
}

// Adapts convex/members.ts's `list` query result. Nested pole objects
// (poleMemberships[].pole, poleLeaderships[].pole) only ever have their
// name/color/icon read by MembersManagement, never `.id`, so they're left
// as raw Convex docs — only the top-level user needs `_id` renamed.
export function adaptMemberListItem(m: any) {
  if (!m) return m;
  return { ...m, id: m._id };
}

// Adapts convex/training.ts's `list`/`get`/`create`/`update` results.
export function adaptTrainingModule(m: any) {
  if (!m) return m;
  return {
    ...m,
    id: m._id,
    pole: m.pole ? { ...m.pole, id: m.pole._id } : m.pole,
    lessons: (m.lessons || []).map((l: any) => ({ ...l, id: l._id })),
  };
}

// Adapts convex/unavailabilities.ts's `list`/`create`/`update` results.
export function adaptUnavailability(u: any) {
  if (!u) return u;
  return {
    ...u,
    id: u._id,
    startsAt: iso(u.startsAt),
    endsAt: iso(u.endsAt),
    user: u.user
      ? {
          ...u.user,
          id: u.user._id,
          poleMemberships: (u.user.poleMemberships || []).map((m: any) => ({
            ...m,
            id: m._id,
            pole: m.pole ? { ...m.pole, id: m.pole._id } : m.pole,
          })),
        }
      : u.user,
  };
}

export function adaptNotification(n: any) {
  if (!n) return n;
  return { ...n, id: n._id, createdAt: iso(n._creationTime) };
}

// Adapts convex/membershipRequests.ts's `list` query result.
export function adaptMembershipRequestListItem(r: any) {
  if (!r) return r;
  return {
    ...r,
    id: r._id,
    createdAt: r._creationTime,
    user: r.user
      ? {
          ...r.user,
          id: r.user._id,
          poleMemberships: (r.user.poleMemberships || []).map((pm: any) => ({ ...pm, id: pm._id })),
        }
      : r.user,
  };
}

// Shapes convex/dashboard.ts's `get` query result into the same structure
// DesktopDashboard/MemberDashboard were already written against (the old
// /api/dashboard response) — everything nested (events, poles, users) goes
// through the adapters above so `.id`/date-string access keeps working.
export function adaptDashboard(raw: any) {
  if (!raw) return raw;
  const memberData = raw.memberData
    ? {
        myAssignments: (raw.memberData.myAssignments || []).map((a: any) => ({
          id: a._id,
          eventId: a.eventId,
          poleId: a.poleId,
          pole: adaptPole(a.pole),
          event: a.event ? adaptEvent(a.event) : null,
          roleTag: a.roleTag ?? null,
          status: a.status,
          assignedChecklist: a.assignedChecklist ? adaptChecklist(a.assignedChecklist) : null,
        })),
        myUnavailabilities: (raw.memberData.myUnavailabilities || []).map((u: any) => ({
          id: u._id,
          userId: u.userId,
          startsAt: iso(u.startsAt),
          endsAt: iso(u.endsAt),
          reason: u.reason ?? null,
          recurrence: u.recurrence,
        })),
        myPoles: (raw.memberData.myPoles || []).filter(Boolean).map(adaptPole),
        nextService: raw.memberData.nextService ? adaptEvent(raw.memberData.nextService) : null,
        nextAssignmentRole: raw.memberData.nextAssignmentRole,
        nextAssignmentPole: raw.memberData.nextAssignmentPole ? adaptPole(raw.memberData.nextAssignmentPole) : null,
        nextAssignmentChecklist: raw.memberData.nextAssignmentChecklist
          ? adaptChecklist(raw.memberData.nextAssignmentChecklist)
          : null,
      }
    : null;

  return {
    currentUserRole: raw.currentUserRole,
    memberData,
    kpis: raw.kpis,
    serviceTrend: raw.serviceTrend,
    annualStats: raw.annualStats,
    poleDistribution: raw.poleDistribution,
    upcomingEvents: (raw.upcomingEvents || []).map(adaptEvent),
    pendingRequests: (raw.pendingRequests || []).map(adaptMembershipRequestLite),
    birthdays: (raw.birthdays || []).map((b: any) => ({ ...b, id: b._id })),
    annualSummary: raw.annualSummary,
  };
}
