/**
 * Rewrites a Cloudinary URL to request a small, compressed, auto-format
 * version instead of the original upload (which can be several MB straight
 * out of a phone camera). Pure string manipulation — safe to use in client
 * components, no SDK/credentials involved. Non-Cloudinary URLs pass through
 * unchanged.
 */
export function optimizedImageUrl(url?: string | null, size: number = 128): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;

  const transform = `w_${size},h_${size},c_fill,g_face,q_auto,f_auto`;
  return url.replace('/upload/', `/upload/${transform}/`);
}
