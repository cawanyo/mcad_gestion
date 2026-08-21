import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('auth_session')?.value;

    const body = await req.json();
    const userId = body.userId || sessionUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const {
      firstName,
      lastName,
      phone,
      gender,
      birthDate,
      avatar,
      currentPassword,
      newPassword
    } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // If changing phone, verify uniqueness
    if (phone && phone.trim() !== existingUser.phone) {
      const cleanPhone = phone.trim();
      const phoneTaken = await prisma.user.findUnique({
        where: { phone: cleanPhone }
      });
      if (phoneTaken && phoneTaken.id !== userId) {
        return NextResponse.json({ error: 'Ce numéro de téléphone est déjà utilisé' }, { status: 409 });
      }
    }

    const updateData: Record<string, any> = {};

    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (gender && (gender === 'HOMME' || gender === 'FEMME')) {
      updateData.gender = gender;
    }
    if (birthDate !== undefined) {
      updateData.birthDate = birthDate ? new Date(birthDate) : null;
    }
    if (avatar !== undefined) updateData.avatar = avatar;

    // Password change
    if (newPassword && newPassword.trim().length > 0) {
      if (existingUser.password && currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, existingUser.password);
        if (!isMatch) {
          return NextResponse.json({ error: 'Le mot de passe actuel est incorrect' }, { status: 400 });
        }
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        poleMemberships: { include: { pole: true } },
        poleLeaderships: { include: { pole: true } }
      }
    });

    broadcastUpdate('PROFILE_UPDATED', { userId: updatedUser.id });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        birthDate: updatedUser.birthDate,
        poleMemberships: updatedUser.poleMemberships,
        poleLeaderships: updatedUser.poleLeaderships
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du profil' }, { status: 500 });
  }
}
