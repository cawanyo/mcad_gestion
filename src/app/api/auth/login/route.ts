import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting: Max 10 attempts per minute per IP / phone
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`login_${clientIp}`, { limit: 10, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      const waitSec = Math.ceil(rateCheck.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Trop de tentatives. Veuillez réessayer dans ${waitSec} secondes.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { phone, identifier, password } = body;

    const inputPhone = (phone || identifier || '').trim();

    if (!inputPhone || !password) {
      return NextResponse.json({ error: 'Numéro de téléphone et mot de passe requis' }, { status: 400 });
    }

    const normalizeDigits = (p: string) => {
      let d = p.replace(/[^0-9]/g, '');
      if (d.startsWith('33') && d.length === 11) {
        d = '0' + d.substring(2);
      }
      return d;
    };

    const digitsOnly = inputPhone.replace(/[^0-9]/g, '');
    const inputNormalized = normalizeDigits(inputPhone);

    // Search user by phone variations
    const users = await prisma.user.findMany({
      include: {
        poleLeaderships: { include: { pole: true } },
        poleMemberships: { include: { pole: true } }
      }
    });

    const user = users.find((u) => {
      if (!u.phone) return false;
      const uRaw = u.phone.trim();
      const uDigits = u.phone.replace(/[^0-9]/g, '');
      const uNormalized = normalizeDigits(uRaw);

      return (
        uRaw === inputPhone ||
        uDigits === digitsOnly ||
        (inputNormalized.length >= 8 && uNormalized === inputNormalized) ||
        (digitsOnly.length >= 8 && uDigits.endsWith(digitsOnly)) ||
        (digitsOnly.length >= 8 && digitsOnly.endsWith(uDigits)) ||
        uRaw.includes(inputPhone) ||
        inputPhone.includes(uRaw)
      );
    });

    if (!user) {
      return NextResponse.json({ error: 'Numéro de téléphone ou mot de passe incorrect' }, { status: 401 });
    }

    // Check account status
    if (user.status === 'INACTIVE') {
      return NextResponse.json({ error: 'Ce compte est inactif. Veuillez contacter un responsable.' }, { status: 403 });
    }

    // Verify password if set
    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Numéro de téléphone ou mot de passe incorrect' }, { status: 401 });
      }
    }

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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur lors de la connexion' }, { status: 500 });
  }
}
