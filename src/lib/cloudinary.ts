import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET_KEY || '5_Is4GEIABwixVgFm-vdY1It6pA';
const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (cloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: cloudinaryUrl
  });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
} else if (apiSecret) {
  cloudinary.config({
    cloud_name: cloudName || 'mcad',
    api_key: apiKey || '111111111111111',
    api_secret: apiSecret,
    secure: true
  });
}

export const isCloudinaryConfigured = (): boolean => {
  return Boolean(
    cloudinaryUrl ||
    (cloudName && apiKey && apiSecret) ||
    (apiSecret && (cloudName || apiKey))
  );
};

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Upload a file Buffer directly to Cloudinary using upload_stream
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    resource_type?: 'auto' | 'image' | 'video' | 'raw';
    filename?: string;
  } = {}
): Promise<CloudinaryUploadResult> {
  const { folder = 'mcad_media', resource_type = 'auto', filename } = options;

  return new Promise((resolve, reject) => {
    const isVideo = resource_type === 'video';

    const uploadOptions: Record<string, any> = {
      folder,
      resource_type: isVideo ? 'video' : resource_type,
      public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined,
      overwrite: true,
      // Use 6MB chunk size for video and large assets to prevent stream timeouts
      chunk_size: isVideo || buffer.length > 5 * 1024 * 1024 ? 6000000 : undefined
    };

    if (isVideo) {
      uploadOptions.timeout = 180000; // 3 minute timeout for videos
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error('Erreur de téléversement Cloudinary'));
        }

        resolve({
          url: result.secure_url || result.url,
          secure_url: result.secure_url || result.url,
          public_id: result.public_id,
          format: result.format,
          resource_type: result.resource_type,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          duration: result.duration
        });
      }
    );

    uploadStream.on('error', (err) => {
      reject(err);
    });

    uploadStream.end(buffer);
  });
}

export { cloudinary };
