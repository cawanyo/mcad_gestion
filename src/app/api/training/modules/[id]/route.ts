import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireLeaderOrAdmin } from '@/lib/auth-server';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const currentUser = auth.user;

    const moduleData = await prisma.trainingModule.findUnique({
      where: { id: params.id },
      include: {
        pole: true,
        lessons: {
          orderBy: { orderIndex: 'asc' },
          include: {
            completions: {
              where: { userId: currentUser.id }
            }
          }
        },
        userProgress: {
          where: { userId: currentUser.id }
        }
      }
    });

    if (!moduleData) {
      return NextResponse.json({ error: 'Module de formation introuvable' }, { status: 404 });
    }

    const totalLessons = moduleData.lessons.length;
    const completedLessons = moduleData.lessons.filter((l) => l.completions.length > 0).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    let userProgressStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
    if (progressPercent === 100 && totalLessons > 0) {
      userProgressStatus = 'COMPLETED';
    } else if (completedLessons > 0 || moduleData.userProgress.length > 0) {
      userProgressStatus = 'IN_PROGRESS';
    }

    const formatted = {
      id: moduleData.id,
      poleId: moduleData.poleId,
      pole: moduleData.pole,
      title: moduleData.title,
      description: moduleData.description,
      coverImage: moduleData.coverImage,
      level: moduleData.level,
      estimatedDuration: moduleData.estimatedDuration,
      orderIndex: moduleData.orderIndex,
      status: moduleData.status,
      lessonsCount: totalLessons,
      completedLessonsCount: completedLessons,
      progressPercent,
      userProgressStatus,
      createdAt: moduleData.createdAt,
      updatedAt: moduleData.updatedAt,
      lessons: moduleData.lessons.map((l) => ({
        id: l.id,
        moduleId: l.moduleId,
        title: l.title,
        description: l.description,
        content: l.content,
        mediaType: l.mediaType,
        mediaUrl: l.mediaUrl,
        durationMinutes: l.durationMinutes,
        orderIndex: l.orderIndex,
        isCompleted: l.completions.length > 0
      }))
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching module details:', error);
    return NextResponse.json({ error: 'Failed to fetch module details' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await req.json();
    const { title, description, coverImage, level, estimatedDuration, status, poleId, lessons } = body;

    // If lessons array is supplied, replace lessons
    if (lessons && Array.isArray(lessons)) {
      await prisma.trainingLesson.deleteMany({
        where: { moduleId: params.id }
      });

      await prisma.trainingLesson.createMany({
        data: lessons.map((l: any, idx: number) => ({
          moduleId: params.id,
          title: l.title.trim(),
          description: l.description?.trim() || null,
          content: l.content?.trim() || null,
          mediaType: l.mediaType || 'NONE',
          mediaUrl: l.mediaUrl || null,
          durationMinutes: Number(l.durationMinutes) || 10,
          orderIndex: idx + 1
        }))
      });
    }

    const updated = await prisma.trainingModule.update({
      where: { id: params.id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(coverImage !== undefined && { coverImage }),
        ...(level && { level }),
        ...(estimatedDuration !== undefined && { estimatedDuration }),
        ...(status && { status }),
        ...(poleId && { poleId })
      },
      include: {
        pole: true,
        lessons: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    broadcastUpdate('TRAINING_MODULE_UPDATED', { moduleId: params.id, poleId: updated.poleId });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json({ error: 'Failed to update training module' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const moduleData = await prisma.trainingModule.findUnique({
      where: { id: params.id }
    });

    if (!moduleData) {
      return NextResponse.json({ error: 'Module introuvable' }, { status: 404 });
    }

    await prisma.trainingModuleProgress.deleteMany({ where: { moduleId: params.id } });
    await prisma.trainingLessonCompletion.deleteMany({
      where: {
        lesson: { moduleId: params.id }
      }
    });
    await prisma.trainingLesson.deleteMany({ where: { moduleId: params.id } });
    await prisma.trainingModule.delete({ where: { id: params.id } });

    broadcastUpdate('TRAINING_MODULE_DELETED', { moduleId: params.id, poleId: moduleData.poleId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting module:', error);
    return NextResponse.json({ error: 'Failed to delete training module' }, { status: 500 });
  }
}
