import { useState, useEffect } from 'react';
import { photoGet } from '@/lib/offlineDb';
import { resolvePhotoUrl } from '@/api/base44Client';
import { isLocalPhoto, getPhotoId } from '@/lib/photoService';

// Показывает фото: серверное (по URL) или локальное (Blob из IndexedDB)
export default function SmartPhoto({ src, className = '', alt = '', onClick }) {
  const [displayUrl, setDisplayUrl] = useState('');

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    const load = async () => {
      if (!src) return;
      if (isLocalPhoto(src)) {
        const blob = await photoGet(getPhotoId(src));
        if (blob && !cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setDisplayUrl(objectUrl);
        }
      } else {
        setDisplayUrl(resolvePhotoUrl(src));
      }
    };
    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!displayUrl) {
    return <div className={`bg-muted animate-pulse ${className}`} />;
  }

  return <img src={displayUrl} className={className} alt={alt} onClick={onClick} />;
}
