export type Role =
  | 'SUPER_ADMIN'
  | 'DEPARTMENT_LEADER'
  | 'POLE_LEADER'
  | 'CALENDAR_MANAGER'
  | 'MEMBER';

export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export type Sex = 'HOMME' | 'FEMME';

export interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  sex?: Sex;
  avatar?: string;
  birthday?: string;
  bio?: string;
  poles?: { pole: Pole; roleTag?: string; joinedAt: string }[];
  // TODO(next pass): these mirror the web app's currentUser.poleMemberships /
  // poleLeaderships shape (see src/contexts/AppShellContext.tsx on the web
  // side) — loosely typed here until the mobile screens are rewired to
  // Convex and this whole file gets aligned with @/types.
  poleMemberships?: { id: string; poleId: string; pole?: Pole; status?: string }[];
  poleLeaderships?: { id: string; poleId: string; pole?: Pole; roleTitle?: string }[];
  membershipRequests?: { id: string; poleId: string; status: string }[];
}

export interface Pole {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  leaderId?: string;
  leader?: User;
  members?: { user: User; roleTag?: string; joinedAt: string }[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  status: string;
  requirements?: {
    id: string;
    poleId: string;
    pole?: Pole;
    requiredCount: number;
  }[];
  assignments?: {
    id: string;
    userId: string;
    user?: User;
    poleId: string;
    roleTag?: string;
    status: string;
  }[];
}

export interface ChecklistStep {
  id: string;
  orderIndex: number;
  title: string;
  instructions?: string;
  mediaType: 'NONE' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  mediaUrl?: string;
  isRequired: boolean;
  estimatedMinutes?: number;
  isCompleted?: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  description?: string;
  poleId: string;
  pole?: Pole;
  steps: ChecklistStep[];
}

export interface TrainingLesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  content?: string;
  mediaType: 'NONE' | 'VIDEO' | 'PHOTO' | 'DOCUMENT';
  mediaUrl?: string;
  durationMinutes?: number;
  orderIndex: number;
  isCompleted?: boolean;
}

export interface TrainingModule {
  id: string;
  poleId: string;
  pole?: Pole;
  title: string;
  description?: string;
  coverImage?: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration?: string;
  orderIndex: number;
  status: string;
  lessons?: TrainingLesson[];
  lessonsCount?: number;
  completedLessonsCount?: number;
  progressPercent?: number;
  userProgressStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface MembershipRequest {
  id: string;
  userId: string;
  user?: User;
  poleId: string;
  pole?: Pole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  motivation?: string;
  createdAt?: string;
}

export interface Unavailability {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
