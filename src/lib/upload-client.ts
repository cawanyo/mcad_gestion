/**
 * Universal High-Speed Client Upload Utility with Real-time Progress
 * Directly uploads to Cloudinary via signed requests (bypasses server bottleneck)
 * with graceful fallback to /api/upload.
 */

export interface UploadProgressInfo {
  percent: number; // 0 to 100
  loadedBytes: number;
  totalBytes: number;
  status: 'signing' | 'uploading' | 'optimizing' | 'completed' | 'error';
  statusText: string;
}

export interface UploadResult {
  url: string;
  mediaType: 'PHOTO' | 'VIDEO';
  provider: 'cloudinary' | 'local';
  publicId?: string;
  size: number;
}

export async function uploadMediaWithProgress(
  file: File,
  options: {
    folder?: string;
    onProgress?: (progress: UploadProgressInfo) => void;
  } = {}
): Promise<UploadResult> {
  const { folder = 'mcad_media', onProgress } = options;

  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
  const mediaType: 'PHOTO' | 'VIDEO' = isVideo ? 'VIDEO' : 'PHOTO';
  const resourceType = isVideo ? 'video' : 'image';

  onProgress?.({
    percent: 5,
    loadedBytes: 0,
    totalBytes: file.size,
    status: 'signing',
    statusText: 'Préparation du téléversement haute vitesse...'
  });

  // 1. Attempt Direct High-Speed Cloudinary Upload via Signed API
  try {
    const signRes = await fetch('/api/upload/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder, resourceType })
    });

    if (signRes.ok) {
      const signData = await signRes.json();
      const { signature, timestamp, apiKey, cloudName, uploadUrl } = signData;

      if (signature && apiKey && cloudName) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', folder);

        const result = await new Promise<UploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl || `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.min(95, Math.round((e.loaded / e.total) * 90) + 5);
              onProgress?.({
                percent,
                loadedBytes: e.loaded,
                totalBytes: e.total,
                status: 'uploading',
                statusText: `Téléversement Cloudinary : ${percent}% (${(e.loaded / (1024 * 1024)).toFixed(1)} / ${(e.total / (1024 * 1024)).toFixed(1)} Mo)`
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                onProgress?.({
                  percent: 100,
                  loadedBytes: file.size,
                  totalBytes: file.size,
                  status: 'completed',
                  statusText: 'Téléversement réussi !'
                });
                resolve({
                  url: data.secure_url || data.url,
                  mediaType,
                  provider: 'cloudinary',
                  publicId: data.public_id,
                  size: data.bytes || file.size
                });
              } catch (parseErr) {
                reject(parseErr);
              }
            } else {
              reject(new Error(`Erreur Cloudinary HTTP ${xhr.status}: ${xhr.responseText}`));
            }
          };

          xhr.onerror = () => reject(new Error('Erreur de connexion Cloudinary direct'));
          xhr.ontimeout = () => reject(new Error('Délai dépassé lors du téléversement Cloudinary'));
          xhr.timeout = 300000; // 5 minutes max

          xhr.send(formData);
        });

        return result;
      }
    }
  } catch (directErr) {
    console.warn('Direct Cloudinary upload failed, falling back to /api/upload:', directErr);
  }

  // 2. Fallback to /api/upload
  onProgress?.({
    percent: 20,
    loadedBytes: 0,
    totalBytes: file.size,
    status: 'uploading',
    statusText: 'Téléversement en cours...'
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const fallbackResult = await new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.min(90, Math.round((e.loaded / e.total) * 85) + 5);
        onProgress?.({
          percent,
          loadedBytes: e.loaded,
          totalBytes: e.total,
          status: 'uploading',
          statusText: `Téléversement : ${percent}%`
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.url) {
            onProgress?.({
              percent: 100,
              loadedBytes: file.size,
              totalBytes: file.size,
              status: 'completed',
              statusText: 'Téléversement réussi !'
            });
            resolve({
              url: data.url,
              mediaType: data.mediaType || mediaType,
              provider: data.provider || 'local',
              publicId: data.publicId,
              size: file.size
            });
          } else {
            reject(new Error(data.error || 'Erreur inconnue lors du téléversement'));
          }
        } catch (err) {
          reject(err);
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || `Erreur HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Erreur HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Erreur réseau lors du téléversement'));
    xhr.timeout = 300000; // 5 minutes max

    xhr.send(formData);
  });

  return fallbackResult;
}
