import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';
import { requireAuth, requireDepartmentLeaderOrAdmin, requirePoleLeaderOrAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const pole = await prisma.pole.findUnique({
      where: { id: params.id },
      include: {
        leaders: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true, role: true }
            }
          }
        },
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true, role: true }
            }
          }
        },
        checklists: {
          where: { status: 'ACTIVE' },
          include: {
            steps: { orderBy: { orderIndex: 'asc' } },
            eventChecklists: { include: { event: true } }
          },
          orderBy: { orderIndex: 'asc' }
        },
        membershipRequests: {
          where: { status: 'PENDING' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        eventRequirements: {
          where: {
            event: {
              startsAt: { gte: new Date() }
            }
          },
          include: {
            event: {
              include: {
                assignments: {
                  where: { poleId: params.id },
                  include: {
                    user: {
                      select: { id: true, firstName: true, lastName: true, phone: true, avatar: true, role: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            event: { startsAt: 'asc' }
          }
        }
      }
    });

    if (!pole) return NextResponse.json({ error: 'Pôle introuvable' }, { status: 404 });

    return NextResponse.json(pole);
  } catch (error) {
    console.error('Error fetching pole details:', error);
    return NextResponse.json({ error: 'Failed to fetch pole' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePoleLeaderOrAdmin(params.id);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await req.json();
    const { name, description, color, icon } = body;

    const pole = await prisma.pole.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color && { color }),
        ...(icon && { icon })
      }
    });

    broadcastUpdate('POLE_UPDATED', { poleId: params.id });

    return NextResponse.json(pole);
  } catch (error) {
    console.error('Error updating pole:', error);
    return NextResponse.json({ error: 'Failed to update pole' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireDepartmentLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    await prisma.poleLeader.deleteMany({ where: { poleId: params.id } });
    await prisma.poleMembership.deleteMany({ where: { poleId: params.id } });
    await prisma.membershipRequest.deleteMany({ where: { poleId: params.id } });
    await prisma.eventRequirement.deleteMany({ where: { poleId: params.id } });
    await prisma.assignment.deleteMany({ where: { poleId: params.id } });
    await prisma.checklist.deleteMany({ where: { poleId: params.id } });
    await prisma.pole.delete({ where: { id: params.id } });

    broadcastUpdate('POLE_DELETED', { poleId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pole:', error);
    return NextResponse.json({ error: 'Failed to delete pole' }, { status: 500 });
  }
}
