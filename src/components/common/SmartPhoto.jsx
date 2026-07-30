import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { photoGet } from '@/lib/offlineDb';
import { resolvePhotoUrl } from '@/api/base44Client';
import { isLocalPhoto, getPhotoId } from '@/lib/photoService';

// Показывает фото: серверное (по URL) или локальное (Blob из IndexedDB)
// По клику открывает фото на весь экран (лайтбокс)
export default function SmartPhoto({ src, className = '', alt = '', onClick, zoomable = true }) {
  const [displayUrl, setDisplayUrl] = useState('');
  const [zoomed, setZoomed] = useState(false);

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

  // Блокируем прокрутку body, когда открыт лайтбокс
  useEffect(() => {
    if (zoomed) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [zoomed]);

  if (!displayUrl) {
    return <div className={`bg-muted animate-pulse ${className}`} />;
  }

  const handleClick = (e) => {
    if (onClick) { onClick(e); return; }
    if (zoomable) setZoomed(true);
  };

  return (
    <>
      <img
        src={displayUrl}
        className={`${className} ${(!onClick && zoomable) ? 'cursor-pointer' : ''}`}
        alt={alt}
        onClick={handleClick}
      />
      {zoomed && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
            className="absolute top-4 right-4 text-white/90 hover:text-white bg-black/40 rounded-full p-2"
            aria-label="Закрыть"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={displayUrl}
            className="max-w-full max-h-full object-contain rounded-lg"
            alt={alt}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
