import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireLeaderOrAdmin } from '@/lib/auth-server';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const currentUser = auth.user;

    const { searchParams } = new URL(req.url);
    const poleId = searchParams.get('poleId');
    const level = searchParams.get('level');
    const search = searchParams.get('search');

    const where: any = {
      status: 'ACTIVE'
    };

    if (poleId && poleId !== 'all') {
      where.poleId = poleId;
    }

    if (level && level !== 'all') {
      where.level = level;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }

    const rawModules = await prisma.trainingModule.findMany({
      where,
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
      },
      orderBy: [
        { poleId: 'asc' },
        { orderIndex: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    const modules = rawModules.map((m) => {
      const totalLessons = m.lessons.length;
      const completedLessons = m.lessons.filter((l) => l.completions.length > 0).length;
      const progressRecord = m.userProgress[0];
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      
      let userProgressStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
      if (progressPercent === 100 && totalLessons > 0) {
        userProgressStatus = 'COMPLETED';
      } else if (completedLessons > 0 || progressRecord) {
        userProgressStatus = 'IN_PROGRESS';
      }

      return {
        id: m.id,
        poleId: m.poleId,
        pole: m.pole,
        title: m.title,
        description: m.description,
        coverImage: m.coverImage,
        level: m.level,
        estimatedDuration: m.estimatedDuration,
        orderIndex: m.orderIndex,
        status: m.status,
        lessonsCount: totalLessons,
        completedLessonsCount: completedLessons,
        progressPercent,
        userProgressStatus,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        lessons: m.lessons.map((l) => ({
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
    });

    return NextResponse.json(modules);
  } catch (error) {
    console.error('Error fetching training modules:', error);
    return NextResponse.json({ error: 'Failed to fetch training modules' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireLeaderOrAdmin();
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await req.json();
    const { poleId, title, description, coverImage, level, estimatedDuration, lessons } = body;

    if (!poleId || !title || !title.trim()) {
      return NextResponse.json({ error: 'Le pôle et le titre sont requis.' }, { status: 400 });
    }

    const newModule = await prisma.trainingModule.create({
      data: {
        poleId,
        title: title.trim(),
        description: description?.trim() || null,
        coverImage: coverImage || null,
        level: level || 'BEGINNER',
        estimatedDuration: estimatedDuration?.trim() || '30 min',
        status: 'ACTIVE',
        lessons: lessons?.length ? {
          create: lessons.map((l: any, idx: number) => ({
            title: l.title.trim(),
            description: l.description?.trim() || null,
            content: l.content?.trim() || null,
            mediaType: l.mediaType || 'NONE',
            mediaUrl: l.mediaUrl || null,
            durationMinutes: Number(l.durationMinutes) || 10,
            orderIndex: idx + 1
          }))
        } : undefined
      },
      include: {
        pole: true,
        lessons: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    broadcastUpdate('TRAINING_MODULE_CREATED', { moduleId: newModule.id, poleId: newModule.poleId });

    return NextResponse.json(newModule);
  } catch (error) {
    console.error('Error creating training module:', error);
    return NextResponse.json({ error: 'Failed to create training module' }, { status: 500 });
  }
}
