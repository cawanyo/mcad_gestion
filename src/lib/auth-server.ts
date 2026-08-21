import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  gender?: string | null;
  role: string;
  status: string;
  departmentId?: string | null;
  poleLeaderships?: { poleId: string }[];
  poleMemberships?: { poleId: string }[];
}

/**
 * Extract currently authenticated user from HTTP-only session cookie
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('auth_session')?.value;

    if (!sessionUserId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      include: {
        poleLeaderships: { select: { poleId: true } },
        poleMemberships: { select: { poleId: true } }
      }
    });

    if (!user || user.status === 'INACTIVE') {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return null;
  }
}

/**
 * Verify caller is authenticated
 */
export async function requireAuth(): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      )
    };
  }
  return { user };
}

/**
 * Verify caller has leader or admin privileges
 * (SUPER_ADMIN, DEPARTMENT_LEADER, POLE_LEADER, CALENDAR_MANAGER)
 */
export async function requireLeaderOrAdmin(): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  const authResult = await requireAuth();
  if ('errorResponse' in authResult) {
    return authResult;
  }

  const { user } = authResult;
  const isLeader =
    user.role === 'SUPER_ADMIN' ||
    user.role === 'DEPARTMENT_LEADER' ||
    user.role === 'POLE_LEADER' ||
    user.role === 'CALENDAR_MANAGER';

  if (!isLeader) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Accès interdit. Privilèges de responsable requis.' },
        { status: 403 }
      )
    };
  }

  return { user };
}

/**
 * Verify caller is Department Leader or Super Admin
 */
export async function requireDepartmentLeaderOrAdmin(): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  const authResult = await requireAuth();
  if ('errorResponse' in authResult) {
    return authResult;
  }

  const { user } = authResult;
  const isDeptLeaderOrAdmin = user.role === 'SUPER_ADMIN' || user.role === 'DEPARTMENT_LEADER';

  if (!isDeptLeaderOrAdmin) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Accès interdit. Réservé aux responsables de département et administrateurs.' },
        { status: 403 }
      )
    };
  }

  return { user };
}

/**
 * Verify caller is Leader of a specific pole, or Department Leader / Super Admin
 */
export async function requirePoleLeaderOrAdmin(poleId: string): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  const authResult = await requireAuth();
  if ('errorResponse' in authResult) {
    return authResult;
  }

  const { user } = authResult;
  const isSuperOrDept = user.role === 'SUPER_ADMIN' || user.role === 'DEPARTMENT_LEADER';
  const isLeaderOfThisPole = user.poleLeaderships?.some((pl) => pl.poleId === poleId);

  if (!isSuperOrDept && !isLeaderOfThisPole) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Accès interdit. Vous devez être responsable de ce pôle.' },
        { status: 403 }
      )
    };
  }

  return { user };
}
