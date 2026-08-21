import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();
  cookieStore.delete('auth_session');
  return NextResponse.json({ success: true, message: 'Déconnecté avec succès' });
}
