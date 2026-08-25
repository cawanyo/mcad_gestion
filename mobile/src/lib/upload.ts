// Native equivalent of src/lib/upload-client.ts on the web. The web version
// signs uploads via /api/upload/signature, a Next.js route that only
// authenticates through a cookie a native client has no way to send — so
// this calls convex/media.ts's getUploadSignature action directly instead
// (any Convex function authenticates via the same Convex Auth session the
// rest of the app already uses, cookie or not).
export interface PickedMedia {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  isVideo: boolean;
}

type GetSignatureFn = (args: { folder: string; resourceType: string }) => Promise<{
  signature: string;
  timestamp: number;
  apiKey: string;
  folder: string;
  uploadUrl: string;
}>;

// `getSignature` is the useAction(api.media.getUploadSignature) result from
// the calling component — actions can't be invoked outside a component/hook
// without the full Convex client, and every screen that uploads already has
// one via the hook, so this just takes the bound function.
export async function uploadPickedMedia(getSignature: GetSignatureFn, media: PickedMedia, folder: string) {
  const resourceType = media.isVideo ? 'video' : 'image';
  const signature = await getSignature({ folder, resourceType });

  const form = new FormData();
  form.append('file', {
    uri: media.uri,
    name: media.fileName || (media.isVideo ? 'upload.mp4' : 'upload.jpg'),
    type: media.mimeType || (media.isVideo ? 'video/mp4' : 'image/jpeg'),
  } as any);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);

  const res = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Échec du téléversement Cloudinary (${res.status}): ${text}`);
  }
  const data = await res.json();
  return { url: data.secure_url || data.url as string, mediaType: (media.isVideo ? 'VIDEO' : 'PHOTO') as 'VIDEO' | 'PHOTO' };
}
