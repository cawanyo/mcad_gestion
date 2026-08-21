import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-server';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const currentUser = auth.user;

    const body = await req.json();
    const { action, moduleId, lessonId } = body;

    if (!moduleId) {
      return NextResponse.json({ error: 'ID du module requis.' }, { status: 400 });
    }

    const moduleData = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: true
      }
    });

    if (!moduleData) {
      return NextResponse.json({ error: 'Module introuvable.' }, { status: 404 });
    }

    const totalLessons = moduleData.lessons.length;

    if (action === 'START_MODULE') {
      const userCompletions = await prisma.trainingLessonCompletion.findMany({
        where: {
          userId: currentUser.id,
          lesson: { moduleId }
        }
      });
      const completedCount = userCompletions.length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isCompleted = progressPercent === 100 && totalLessons > 0;
      const initialStatus = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';

      const progress = await prisma.trainingModuleProgress.upsert({
        where: {
          userId_moduleId: {
            userId: currentUser.id,
            moduleId
          }
        },
        create: {
          userId: currentUser.id,
          moduleId,
          status: initialStatus,
          progressPercent,
          completedLessonsCount: completedCount,
          totalLessonsCount: totalLessons,
          startedAt: new Date(),
          completedAt: isCompleted ? new Date() : null,
          lastAccessedAt: new Date()
        },
        update: {
          status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          lastAccessedAt: new Date()
        }
      });

      broadcastUpdate('TRAINING_PROGRESS_UPDATED', {
        userId: currentUser.id,
        moduleId,
        status: progress.status
      });

      return NextResponse.json({ success: true, progress });
    }

    if (action === 'TOGGLE_LESSON' || action === 'COMPLETE_LESSON') {
      if (!lessonId) {
        return NextResponse.json({ error: 'ID de la leçon requis.' }, { status: 400 });
      }

      const existingCompletion = await prisma.trainingLessonCompletion.findUnique({
        where: {
          userId_lessonId: {
            userId: currentUser.id,
            lessonId
          }
        }
      });

      let isNowCompleted = false;

      if (existingCompletion) {
        if (action === 'TOGGLE_LESSON') {
          // Uncomplete lesson
          await prisma.trainingLessonCompletion.delete({
            where: { id: existingCompletion.id }
          });
          isNowCompleted = false;
        } else {
          isNowCompleted = true;
        }
      } else {
        // Complete lesson
        await prisma.trainingLessonCompletion.create({
          data: {
            userId: currentUser.id,
            lessonId
          }
        });
        isNowCompleted = true;
      }

      // Recalculate module progress
      const userCompletions = await prisma.trainingLessonCompletion.findMany({
        where: {
          userId: currentUser.id,
          lesson: { moduleId }
        }
      });

      const completedCount = userCompletions.length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isCompleted = progressPercent === 100 && totalLessons > 0;
      const progressStatus = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';

      const progress = await prisma.trainingModuleProgress.upsert({
        where: {
          userId_moduleId: {
            userId: currentUser.id,
            moduleId
          }
        },
        create: {
          userId: currentUser.id,
          moduleId,
          status: progressStatus,
          progressPercent,
          completedLessonsCount: completedCount,
          totalLessonsCount: totalLessons,
          startedAt: new Date(),
          completedAt: isCompleted ? new Date() : null,
          lastAccessedAt: new Date()
        },
        update: {
          status: progressStatus,
          progressPercent,
          completedLessonsCount: completedCount,
          totalLessonsCount: totalLessons,
          completedAt: isCompleted ? new Date() : null,
          lastAccessedAt: new Date()
        }
      });

      // If user just completed the entire module, create celebratory notification
      if (isCompleted && (!existingCompletion || progressStatus === 'COMPLETED')) {
        await prisma.notification.create({
          data: {
            userId: currentUser.id,
            title: 'Félicitations ! 🎓',
            message: `Vous avez validé avec succès le module de formation "${moduleData.title}".`,
            type: 'TRAINING_COMPLETED',
            linkUrl: '/training'
          }
        }).catch((e) => console.error(e));
      }

      broadcastUpdate('TRAINING_PROGRESS_UPDATED', {
        userId: currentUser.id,
        moduleId,
        lessonId,
        progressPercent,
        completedCount,
        isCompleted
      });

      return NextResponse.json({
        success: true,
        isLessonCompleted: isNowCompleted,
        progressPercent,
        completedCount,
        totalLessons,
        progressStatus
      });
    }

    return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
  } catch (error) {
    console.error('Error updating training progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
