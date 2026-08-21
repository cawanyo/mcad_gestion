import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      include: { event: true, pole: true }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    await prisma.assignment.delete({ where: { id: params.id } });

    // Clean pending service validation if not completed
    await prisma.serviceValidation.deleteMany({
      where: {
        eventId: assignment.eventId,
        userId: assignment.userId,
        poleId: assignment.poleId,
        status: 'PENDING'
      }
    });

    broadcastUpdate('ASSIGNMENT_DELETED', {
      assignmentId: params.id,
      eventId: assignment.eventId,
      userId: assignment.userId,
      poleId: assignment.poleId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}
