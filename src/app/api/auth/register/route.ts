import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { arePhonesMatching, formatPhoneDisplay } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting: Max 5 registrations per 15 minutes per IP
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`register_${clientIp}`, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rateCheck.success) {
      const waitSec = Math.ceil(rateCheck.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Trop de créations de compte. Veuillez réessayer dans ${waitSec} secondes.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, phone, gender, password, birthDate, poleIds, motivation } = body;

    if (!firstName || !lastName || !phone || !password) {
      return NextResponse.json({
        error: 'Prénom, nom, numéro de téléphone et mot de passe sont obligatoires'
      }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({
        error: 'Le mot de passe doit comporter au moins 4 caractères'
      }, { status: 400 });
    }

    const formattedPhone = formatPhoneDisplay(phone);

    // Check if phone number is already registered
    const existingUsers = await prisma.user.findMany({
      select: { id: true, phone: true }
    });

    const alreadyTaken = existingUsers.some((u) => arePhonesMatching(u.phone, phone));

    if (alreadyTaken) {
      return NextResponse.json({ error: 'Un compte existe déjà avec ce numéro de téléphone' }, { status: 409 });
    }

    const dept = await prisma.department.findFirst();
    const hashedPassword = await bcrypt.hash(password, 10);

    const validGender = gender === 'FEMME' ? 'FEMME' : 'HOMME';

    // Create User
    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: formattedPhone,
        gender: validGender,
        password: hashedPassword,
        birthDate: birthDate ? new Date(birthDate) : null,
        role: 'MEMBER',
        status: 'ACTIVE',
        departmentId: dept?.id,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firstName + lastName)}`
      }
    });

    // Create membership requests if poles were selected
    if (poleIds && Array.isArray(poleIds) && poleIds.length > 0) {
      for (const poleId of poleIds) {
        await prisma.membershipRequest.create({
          data: {
            userId: user.id,
            poleId,
            status: 'PENDING',
            motivation: motivation || 'Demande formulée lors de l\'inscription.'
          }
        });
      }
    }

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Bienvenue sur MCAD !",
        message: "Votre compte a été créé avec succès. Vos demandes d'adhésion aux pôles sont transmises aux responsables.",
        type: "WELCOME"
      }
    }).catch((e) => console.error(e));

    // Set HTTP-only session cookie
    const cookieStore = cookies();
    cookieStore.set('auth_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        avatar: user.avatar,
        birthDate: user.birthDate
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 });
  }
}
