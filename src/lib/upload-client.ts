/**
 * Universal High-Speed Client Upload Utility with Real-time Progress
 * Directly uploads to Cloudinary via signed chunked requests (bypasses server bottleneck)
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

const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB chunks for Cloudinary chunked upload (Cloudinary requires >= 5MB for intermediate chunks)
const MAX_DIRECT_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB max for direct upload on Cloudinary standard plan
const MAX_DIRECT_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB max for images

/**
 * Upload large files to Cloudinary in 6MB chunks with auto-retry and progress tracking
 */
async function uploadChunkedToCloudinary(
  file: File,
  signData: { signature: string; timestamp: number; apiKey: string; cloudName: string; uploadUrl?: string },
  folder: string,
  resourceType: string,
  mediaType: 'PHOTO' | 'VIDEO',
  onProgress?: (progress: UploadProgressInfo) => void
): Promise<UploadResult> {
  const { signature, timestamp, apiKey, cloudName, uploadUrl } = signData;
  const endpoint = uploadUrl || `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const uniqueId = `mcad_chunk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const totalBytes = file.size;
  let start = 0;
  let finalResponse: any = null;

  while (start < totalBytes) {
    const end = Math.min(start + CHUNK_SIZE, totalBytes);
    const chunk = file.slice(start, end);
    const contentRange = `bytes ${start}-${end - 1}/${totalBytes}`;

    let attempts = 0;
    let chunkSuccess = false;

    while (attempts < 3 && !chunkSuccess) {
      attempts++;
      try {
        const formData = new FormData();
        formData.append('file', chunk, file.name);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', folder);

        const chunkResult = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', endpoint);
          xhr.setRequestHeader('X-Unique-Upload-Id', uniqueId);
          xhr.setRequestHeader('Content-Range', contentRange);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const currentLoaded = start + e.loaded;
              const percent = Math.min(98, Math.round((currentLoaded / totalBytes) * 90) + 5);
              onProgress?.({
                percent,
                loadedBytes: currentLoaded,
                totalBytes,
                status: 'uploading',
                statusText: `Téléversement vidéo (${percent}%) : ${(currentLoaded / (1024 * 1024)).toFixed(1)} / ${(totalBytes / (1024 * 1024)).toFixed(1)} Mo`
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (err) {
                reject(err);
              }
            } else {
              try {
                const errData = JSON.parse(xhr.responseText);
                const msg = errData?.error?.message || `Erreur Cloudinary ${xhr.status}`;
                reject(new Error(msg));
              } catch {
                reject(new Error(`Erreur Cloudinary HTTP ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Erreur de connexion réseau lors du segment'));
          xhr.ontimeout = () => reject(new Error('Délai d\'attente dépassé'));
          xhr.timeout = 180000; // 3 minutes max per 6MB chunk

          xhr.send(formData);
        });

        chunkSuccess = true;
        if (chunkResult.secure_url || chunkResult.url) {
          finalResponse = chunkResult;
        }
      } catch (err: any) {
        if (attempts >= 3) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    start = end;
  }

  if (!finalResponse || (!finalResponse.secure_url && !finalResponse.url)) {
    throw new Error('Réponse finale Cloudinary invalide');
  }

  onProgress?.({
    percent: 100,
    loadedBytes: totalBytes,
    totalBytes,
    status: 'completed',
    statusText: 'Téléversement réussi !'
  });

  return {
    url: finalResponse.secure_url || finalResponse.url,
    mediaType,
    provider: 'cloudinary',
    publicId: finalResponse.public_id,
    size: finalResponse.bytes || totalBytes
  };
}

export async function uploadMediaWithProgress(
  file: File,
  options: {
    folder?: string;
    onProgress?: (progress: UploadProgressInfo) => void;
  } = {}
): Promise<UploadResult> {
  const { folder = 'mcad_media', onProgress } = options;

  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|3gp|mkv)$/i.test(file.name);
  const mediaType: 'PHOTO' | 'VIDEO' = isVideo ? 'VIDEO' : 'PHOTO';
  const resourceType = isVideo ? 'video' : 'image';

  // Fast check: Prevent user from waiting if video exceeds Cloudinary limit
  if (isVideo && file.size > MAX_DIRECT_VIDEO_SIZE) {
    throw new Error(
      `Cette vidéo est trop volumineuse (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale de fichier acceptée en téléversement direct est de 100 Mo. Astuce : Pour les vidéos longues ou lourdes, collez directement un lien YouTube (non répertorié), Loom, Vimeo ou Google Drive.`
    );
  }

  if (!isVideo && file.size > MAX_DIRECT_IMAGE_SIZE) {
    throw new Error(
      `Cette image est trop volumineuse (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale pour une image est de 20 Mo.`
    );
  }

  onProgress?.({
    percent: 5,
    loadedBytes: 0,
    totalBytes: file.size,
    status: 'signing',
    statusText: isVideo ? 'Initialisation du téléversement vidéo...' : 'Initialisation...'
  });

  // 1. Direct High-Speed Cloudinary Upload via Signed API
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
        // If it's a video larger than 6MB, use chunked upload for ultra-reliability
        if (isVideo && file.size > CHUNK_SIZE) {
          return await uploadChunkedToCloudinary(
            file,
            signData,
            folder,
            resourceType,
            mediaType,
            onProgress
          );
        }

        // Otherwise standard single request
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
                statusText: `Téléversement : ${percent}% (${(e.loaded / (1024 * 1024)).toFixed(1)} / ${(e.total / (1024 * 1024)).toFixed(1)} Mo)`
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
              try {
                const errData = JSON.parse(xhr.responseText);
                const rawMsg = errData?.error?.message || '';
                if (rawMsg.toLowerCase().includes('file size too large')) {
                  reject(
                    new Error(
                      `Fichier trop lourd pour Cloudinary (${(file.size / (1024 * 1024)).toFixed(1)} Mo). Recommandation : Utilisez un lien YouTube, Loom ou Google Drive.`
                    )
                  );
                } else {
                  reject(new Error(rawMsg || `Erreur Cloudinary HTTP ${xhr.status}`));
                }
              } catch {
                reject(new Error(`Erreur Cloudinary HTTP ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Erreur de connexion Cloudinary direct'));
          xhr.ontimeout = () => reject(new Error('Délai dépassé lors du téléversement'));
          xhr.timeout = 300000; // 5 minutes max

          xhr.send(formData);
        });

        return result;
      }
    }
  } catch (directErr: any) {
    console.warn('Direct Cloudinary upload failed, falling back to /api/upload:', directErr);
    // If the error was explicitly about file size, do not waste time retrying locally
    if (directErr?.message && directErr.message.includes('volumineuse')) {
      throw directErr;
    }
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
          statusText: `Téléversement : ${percent}% (${(e.loaded / (1024 * 1024)).toFixed(1)} / ${(e.total / (1024 * 1024)).toFixed(1)} Mo)`
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

export async function uploadFileToCloudinary(file: File): Promise<string> {
  const result = await uploadMediaWithProgress(file);
  return result.url;
}
