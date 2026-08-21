export type UserRole = 'SUPER_ADMIN' | 'DEPARTMENT_LEADER' | 'POLE_LEADER' | 'CALENDAR_MANAGER' | 'MEMBER';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  gender?: string | null;
  email?: string | null;
  birthDate?: string | null;
  avatar?: string | null;
  role: UserRole;
  status: string;
  departmentId?: string | null;
  poleMemberships?: { id: string; poleId: string; pole: Pole; status: string }[];
  poleLeaderships?: { id: string; poleId: string; pole: Pole }[];
}

export interface Pole {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  orderIndex: number;
  status: string;
  membersCount?: number;
  leadersCount?: number;
  leaders?: { id: string; user: User; roleTitle?: string | null }[];
}

export interface MembershipRequest {
  id: string;
  userId: string;
  user: User;
  poleId: string;
  pole: Pole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  motivation?: string | null;
  createdAt: string;
}

export interface EventRequirement {
  id: string;
  eventId: string;
  poleId: string;
  pole: Pole;
  requiredCount: number;
  assignedCount?: number;
  notes?: string | null;
  roleExpected?: string | null;
}

export interface Assignment {
  id: string;
  eventId: string;
  poleId: string;
  pole: Pole;
  userId: string;
  user: User;
  roleTag?: string | null;
  status: string;
  assignedById?: string | null;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  location: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
  coverImage?: string | null;
  organizerPoleId?: string | null;
  organizerPole?: Pole | null;
  requirements: EventRequirement[];
  assignments: Assignment[];
  eventChecklists?: { checklist: Checklist }[];
}

export interface Unavailability {
  id: string;
  userId: string;
  user?: User;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
  recurrence: string;
  createdAt?: string;
}

export interface ChecklistStep {
  id: string;
  checklistId: string;
  orderIndex: number;
  title: string;
  description?: string | null;
  details?: string | null;
  mediaType: 'NONE' | 'PHOTO' | 'VIDEO' | 'TEXT';
  mediaUrl?: string | null;
  mediaThumbnail?: string | null;
  isRequired: boolean;
}

export interface Checklist {
  id: string;
  poleId: string;
  pole?: Pole;
  title: string;
  description?: string | null;
  status: string;
  orderIndex: number;
  steps: ChecklistStep[];
  eventChecklists?: { eventId: string; event: Event }[];
}

export interface ChecklistExecutionStep {
  id: string;
  stepId: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface ChecklistExecution {
  id: string;
  eventId: string;
  checklistId: string;
  userId: string;
  status: string;
  stepsCompleted: ChecklistExecutionStep[];
  startedAt: string;
  completedAt?: string | null;
}

export interface ServiceValidation {
  id: string;
  eventId: string;
  event: Event;
  poleId: string;
  pole: Pole;
  userId: string;
  user: User;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  comment?: string | null;
  rating?: number | null;
  validatedAt?: string | null;
  reminderSentAt?: string | null;
  reminderCount: number;
  assignedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export interface TrainingLesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  content?: string | null;
  mediaType: 'NONE' | 'VIDEO' | 'PHOTO' | 'DOCUMENT';
  mediaUrl?: string | null;
  durationMinutes?: number | null;
  orderIndex: number;
  isCompleted?: boolean;
}

export interface TrainingModule {
  id: string;
  poleId: string;
  pole?: Pole;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration?: string | null;
  orderIndex: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  lessonsCount?: number;
  completedLessonsCount?: number;
  progressPercent?: number;
  userProgressStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  lessons?: TrainingLesson[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingModuleProgress {
  id: string;
  userId: string;
  moduleId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progressPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  startedAt: string;
  completedAt?: string | null;
  lastAccessedAt: string;
}
