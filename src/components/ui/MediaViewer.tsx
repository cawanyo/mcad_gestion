'use client';

import React from 'react';
import { Film, Image as ImageIcon, AlertCircle, Play, ExternalLink } from 'lucide-react';

interface MediaViewerProps {
  url?: string | null;
  mediaType?: 'NONE' | 'PHOTO' | 'VIDEO' | 'DOCUMENT' | string;
  title?: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
  autoPlay?: boolean;
  controls?: boolean;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  url,
  mediaType = 'NONE',
  title = '',
  className = '',
  aspectRatio = 'video',
  autoPlay = false,
  controls = true
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  if (!url || mediaType === 'NONE') return null;

  const cleanUrl = url.trim();

  // Helper to extract YouTube embed URL
  const getYouTubeEmbedUrl = (link: string): string | null => {
    try {
      if (link.includes('youtu.be/')) {
        const id = link.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
        return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
      }
      if (link.includes('youtube.com/watch')) {
        const urlObj = new URL(link);
        const v = urlObj.searchParams.get('v');
        return v ? `https://www.youtube.com/embed/${v}?rel=0` : null;
      }
      if (link.includes('youtube.com/embed/')) {
        return link;
      }
      if (link.includes('youtube.com/shorts/')) {
        const id = link.split('youtube.com/shorts/')[1]?.split('?')[0];
        return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  // Helper to extract Vimeo embed URL
  const getVimeoEmbedUrl = (link: string): string | null => {
    try {
      if (link.includes('vimeo.com/')) {
        const id = link.split('vimeo.com/')[1]?.split('?')[0]?.split('#')[0];
        if (id && /^\d+$/.test(id)) {
          return `https://player.vimeo.com/video/${id}`;
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  // Helper to extract Loom embed URL
  const getLoomEmbedUrl = (link: string): string | null => {
    try {
      if (link.includes('loom.com/share/')) {
        const id = link.split('loom.com/share/')[1]?.split('?')[0];
        return id ? `https://www.loom.com/embed/${id}` : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const isVideo =
    mediaType === 'VIDEO' ||
    /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(cleanUrl) ||
    cleanUrl.includes('/video/upload/') ||
    cleanUrl.includes('youtube.com') ||
    cleanUrl.includes('youtu.be') ||
    cleanUrl.includes('vimeo.com') ||
    cleanUrl.includes('loom.com');

  const ytEmbed = getYouTubeEmbedUrl(cleanUrl);
  const vimeoEmbed = getVimeoEmbedUrl(cleanUrl);
  const loomEmbed = getLoomEmbedUrl(cleanUrl);
  const iframeSrc = ytEmbed || vimeoEmbed || loomEmbed;

  const aspectClass =
    aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : '';

  if (hasError) {
    return (
      <div className={`p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center space-y-1.5 ${className}`}>
        <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Impossible de charger le média</p>
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium"
        >
          <span>Ouvrir dans un nouvel onglet</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  // Render Video
  if (isVideo) {
    if (iframeSrc) {
      return (
        <div className={`relative rounded-2xl overflow-hidden bg-black shadow-md border border-slate-800 ${aspectClass} ${className}`}>
          <iframe
            src={iframeSrc}
            title={title || 'Vidéo MCAD'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className={`relative rounded-2xl overflow-hidden bg-black shadow-md border border-slate-800 flex items-center justify-center ${aspectClass} ${className}`}>
        <video
          src={cleanUrl}
          controls={controls}
          autoPlay={autoPlay}
          playsInline
          preload="metadata"
          onError={() => setHasError(true)}
          className="w-full h-full max-h-[500px] object-contain bg-black"
        />
      </div>
    );
  }

  // Render Image / Photo
  return (
    <div className={`relative rounded-2xl overflow-hidden bg-slate-950 shadow-md border border-slate-800 flex items-center justify-center max-h-[480px] ${className}`}>
      <img
        src={cleanUrl}
        alt={title || 'Média'}
        onError={() => setHasError(true)}
        className="max-w-full max-h-[460px] object-contain p-1 rounded-xl"
      />
    </div>
  );
};
