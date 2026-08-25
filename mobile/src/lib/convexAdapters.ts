// Mirrors src/lib/convexAdapters.ts on the web side: Convex documents use
// `_id`/numeric timestamps, this app's screens are written against the
// `id: string` / ISO-date shapes in src/types. Kept as a separate file
// (not shared with web) since the mobile app has its own package.json and
// build, but the field mapping must stay in sync with the web adapter.
import type { Event, Pole, User, TrainingModule, Checklist } from '../types';

const iso = (ms: number | null | undefined): string => (ms ? new Date(ms).toISOString() : '');

export function adaptUserCard(u: any): User | undefined {
  if (!u) return undefined;
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone ?? '',
    role: u.role,
    status: u.status ?? 'ACTIVE',
    sex: u.gender,
    avatar: u.avatar ?? undefined,
  } as User;
}

export function adaptPole(p: any): Pole {
  return {
    id: p._id,
    name: p.name,
    slug: p._id,
    description: p.description ?? undefined,
    color: p.color,
  } as Pole;
}

export function adaptRequirement(r: any) {
  return {
    id: r._id,
    poleId: r.poleId,
    pole: r.pole ? adaptPole(r.pole) : undefined,
    requiredCount: r.requiredCount,
  };
}

export function adaptAssignment(a: any) {
  return {
    id: a._id,
    userId: a.userId,
    user: adaptUserCard(a.user),
    poleId: a.poleId,
    pole: a.pole ? adaptPole(a.pole) : undefined,
    roleTag: a.roleTag ?? undefined,
    status: a.status,
  };
}

export function adaptEvent(e: any): Event {
  return {
    id: e._id,
    title: e.title,
    description: e.description ?? undefined,
    startsAt: iso(e.startsAt),
    endsAt: iso(e.endsAt),
    location: e.location,
    status: e.status,
    requirements: (e.requirements || []).map(adaptRequirement),
    assignments: (e.assignments || []).map(adaptAssignment),
  } as Event;
}

export function adaptChecklist(c: any): Checklist {
  return {
    id: c._id,
    title: c.title,
    description: c.description ?? undefined,
    poleId: c.poleId,
    steps: (c.steps || []).map((s: any) => ({
      id: s._id,
      orderIndex: s.orderIndex,
      title: s.title,
      instructions: s.description ?? undefined,
      mediaType: s.mediaType,
      mediaUrl: s.mediaUrl ?? undefined,
      isRequired: s.isRequired,
    })),
  } as Checklist;
}

export function adaptTrainingModule(m: any): TrainingModule {
  return {
    id: m._id,
    poleId: m.poleId,
    title: m.title,
    description: m.description ?? undefined,
    coverImage: m.coverImage ?? undefined,
    level: m.level,
    estimatedDuration: m.estimatedDuration ?? undefined,
    orderIndex: m.orderIndex,
    status: m.status,
  } as TrainingModule;
}

// Same derivation as (app)/layout.tsx on the web: poles.list already
// carries each pole's membership/leadership lists, so the current user's
// own pole memberships (with the full nested pole, not just an id — every
// consumer, e.g. self-assign eligibility, expects pm.pole to be populated)
// come from filtering that list rather than a separate query.
export function derivePoleMemberships(polesRaw: any[] | undefined, viewerId: string) {
  return (polesRaw || []).flatMap((p: any) =>
    (p.memberships || [])
      .filter((m: any) => m.userId === viewerId)
      .map((m: any) => ({ id: m._id, poleId: p._id, pole: adaptPole(p), status: m.status }))
  );
}
