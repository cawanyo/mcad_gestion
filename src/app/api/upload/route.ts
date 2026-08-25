import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

// Allowed MIME types & extensions whitelist
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/m4v', 'video/3gpp']);
const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: Request) {
  try {
    // 1. Require Authentication (Convex Auth — see /api/upload/signature
    // for why this used to be the old cookie-based requireAuth())
    if (!(await isAuthenticatedNextjs())) {
      return NextResponse.json({ error: 'Non authentifié. Veuillez vous connecter.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const customFolder = (formData.get('folder') as string) || 'mcad_media';

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const mimeType = (file.type || '').toLowerCase();
    const originalExt = extname(file.name || '').toLowerCase();

    // 2. Validate Type & Extension
    const isImage = ALLOWED_IMAGE_TYPES.has(mimeType) && ALLOWED_IMAGE_EXTS.has(originalExt);
    const isVideo = (ALLOWED_VIDEO_TYPES.has(mimeType) || mimeType.startsWith('video/')) && ALLOWED_VIDEO_EXTS.has(originalExt);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          error: 'Format non autorisé. Formats acceptés : JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, M4V.'
        },
        { status: 400 }
      );
    }

    // 3. Validate File Size
    const mediaType: 'PHOTO' | 'VIDEO' = isVideo ? 'VIDEO' : 'PHOTO';
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxMb = isVideo ? 100 : 15;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `Le fichier est trop volumineux. Taille maximale : ${maxMb} Mo.`
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Try Cloudinary Upload First
    const baseName = file.name
      .replace(originalExt, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueFilename = `${Date.now()}_${baseName}`;

    try {
      if (isCloudinaryConfigured()) {
        const cloudinaryResult = await uploadToCloudinary(buffer, {
          folder: customFolder,
          resource_type: isVideo ? 'video' : 'image',
          filename: uniqueFilename
        });

        return NextResponse.json({
          success: true,
          url: cloudinaryResult.secure_url || cloudinaryResult.url,
          mediaType,
          provider: 'cloudinary',
          publicId: cloudinaryResult.public_id,
          size: file.size,
          mimeType
        });
      }
    } catch (cloudErr) {
      console.warn('Cloudinary upload attempt error, falling back to local storage:', cloudErr);
    }

    // 5. Fallback: Save to public/uploads
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${baseName}${originalExt}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaType,
      provider: 'local',
      filename,
      size: file.size,
      mimeType
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Erreur lors du téléversement du fichier' }, { status: 500 });
  }
}
