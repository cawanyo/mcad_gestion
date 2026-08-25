import { NextResponse } from 'next/server';
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Auth now runs entirely on Convex Auth — the old cookie-based
    // requireAuth() never sees a session anymore since login stopped
    // setting that cookie, which made every upload fail with "Non
    // authentifié" even for a logged-in user.
    if (!(await isAuthenticatedNextjs())) {
      return NextResponse.json({ error: 'Non authentifié. Veuillez vous connecter.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const folder = body.folder || 'mcad_media';
    const resourceType = body.resourceType || 'auto';

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dr1ovaq64';
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '285229563141786';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '5_Is4GEIABwixVgFm-vdY1It6pA';

    if (!apiSecret || !apiKey || !cloudName) {
      return NextResponse.json({ error: 'Configuration Cloudinary incomplète' }, { status: 500 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign: Record<string, any> = {
      folder,
      timestamp
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType === 'image' ? 'image' : resourceType === 'video' ? 'video' : 'auto'}/upload`
    });
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération de signature' }, { status: 500 });
  }
}
