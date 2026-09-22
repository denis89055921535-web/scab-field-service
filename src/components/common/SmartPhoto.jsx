import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { photoGet } from '@/lib/offlineDb';
import { resolvePhotoUrl } from '@/api/base44Client';
import { isLocalPhoto, getPhotoId } from '@/lib/photoService';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 50;

function distanceBetweenTouches(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

async function resolveUrl(rawSrc) {
  if (!rawSrc) return '';
  if (isLocalPhoto(rawSrc)) {
    const blob = await photoGet(getPhotoId(rawSrc));
    if (blob) return URL.createObjectURL(blob);
    return '';
  }
  return resolvePhotoUrl(rawSrc);
}

// Показывает фото: серверное (по URL) или локальное (Blob из IndexedDB)
// По клику открывает фото на весь экран (лайтбокс) с возможностью увеличения:
// pinch-to-zoom и перетаскивание на тач-экранах, колесо мыши и двойной клик на десктопе.
// Если передан проп gallery (массив всех src в наборе) — лайтбокс превращается в карусель:
// стрелки/свайп для перехода к соседним фото без закрытия просмотра.
export default function SmartPhoto({ src, className = '', alt = '', onClick, zoomable = true, fallback = null, gallery = null, index = null }) {
  const [displayUrl, setDisplayUrl] = useState('');
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);

  // Галерея: список src и текущий индекс внутри лайтбокса
  const effectiveGallery = gallery && gallery.length > 0 ? gallery : [src];
  const openIndex = index !== null ? index : Math.max(0, effectiveGallery.indexOf(src));
  const [currentIndex, setCurrentIndex] = useState(openIndex);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const lightboxObjectUrlRef = useRef(null);

  // Состояние зума/пана внутри лайтбокса
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const pinchRef = useRef({ pinching: false, startDist: 0, startScale: 1 });
  const swipeRef = useRef({ startX: 0, active: false });

  useEffect(() => {
    setFailed(false);
    let objectUrl = null;
    let cancelled = false;
    const load = async () => {
      if (!src) return;
      const url = await resolveUrl(src);
      if (!cancelled && url) {
        if (isLocalPhoto(src)) objectUrl = url;
        setDisplayUrl(url);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  // Загрузка текущего фото карусели при открытии лайтбокса или смене индекса
  useEffect(() => {
    if (!zoomed) return;
    let cancelled = false;
    const rawSrc = effectiveGallery[currentIndex];
    const load = async () => {
      const url = await resolveUrl(rawSrc);
      if (!cancelled) setLightboxUrl(url);
    };
    load();
    return () => {
      cancelled = true;
      if (lightboxObjectUrlRef.current) {
        URL.revokeObjectURL(lightboxObjectUrlRef.current);
        lightboxObjectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed, currentIndex]);

  useEffect(() => {
    if (isLocalPhoto(effectiveGallery[currentIndex]) && lightboxUrl) {
      lightboxObjectUrlRef.current = lightboxUrl;
    }
  }, [lightboxUrl, currentIndex]);

  // Блокируем прокрутку body, когда открыт лайтбокс; сбрасываем зум/индекс при закрытии
  useEffect(() => {
    if (zoomed) {
      document.body.style.overflow = 'hidden';
      setCurrentIndex(openIndex);
      return () => { document.body.style.overflow = ''; };
    } else {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed]);

  // Сброс зума/пана при переключении на другое фото карусели
  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [currentIndex]);

  const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const resetZoom = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, effectiveGallery.length - 1));
  }, [effectiveGallery.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setScale((s) => (s > 1 ? 1 : 2.5));
    setPos({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    setScale((s) => clampScale(s + delta));
  };

  // --- Мышь: перетаскивание при зуме ---
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
  };
  const handleMouseMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy });
  };
  const handleMouseUp = () => { dragRef.current.dragging = false; };

  // --- Тач: pinch-to-zoom, перетаскивание одним пальцем при зуме, свайп-навигация при обычном масштабе ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        pinching: true,
        startDist: distanceBetweenTouches(e.touches),
        startScale: scale,
      };
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        dragRef.current = {
          dragging: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startPosX: pos.x,
          startPosY: pos.y,
        };
      } else {
        swipeRef.current = { startX: e.touches[0].clientX, active: true };
      }
    }
  };
  const handleTouchMove = (e) => {
    if (pinchRef.current.pinching && e.touches.length === 2) {
      e.preventDefault();
      const newDist = distanceBetweenTouches(e.touches);
      const ratio = newDist / pinchRef.current.startDist;
      setScale(clampScale(pinchRef.current.startScale * ratio));
    } else if (dragRef.current.dragging && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy });
    }
  };
  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) pinchRef.current.pinching = false;
    if (e.touches.length === 0) {
      dragRef.current.dragging = false;
      if (swipeRef.current.active && e.changedTouches && e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - swipeRef.current.startX;
        if (Math.abs(deltaX) > SWIPE_THRESHOLD && effectiveGallery.length > 1) {
          if (deltaX < 0) goNext(); else goPrev();
        }
      }
      swipeRef.current = { startX: 0, active: false };
    }
  };

  if (failed && fallback && !zoomed) {
    return fallback;
  }
  if (!displayUrl) {
    return <div className={`bg-muted animate-pulse ${className}`} />;
  }

  const handleClick = (e) => {
    if (onClick) { onClick(e); return; }
    if (zoomable) setZoomed(true);
  };

  const hasMultiple = effectiveGallery.length > 1;

  return (
    <>
      <img
        src={displayUrl}
        className={`${className} ${(!onClick && zoomable) ? 'cursor-pointer' : ''}`}
        alt={alt}
        onClick={handleClick}
        onError={() => { if (!zoomed) setFailed(true); }}
      />
      {zoomed && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center overflow-hidden select-none"
          onClick={() => { if (scale === 1) setZoomed(false); }}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
            className="absolute top-4 right-4 z-10 text-white/90 hover:text-white bg-black/40 rounded-full p-2"
            aria-label="Закрыть"
          >
            <X className="w-6 h-6" />
          </button>

          {scale > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              className="absolute top-4 left-4 z-10 text-white/90 hover:text-white bg-black/40 rounded-full p-2"
              aria-label="Сбросить масштаб"
            >
              <ZoomOut className="w-6 h-6" />
            </button>
          )}

          {hasMultiple && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/80 text-sm bg-black/40 rounded-full px-3 py-1">
              {currentIndex + 1} / {effectiveGallery.length}
            </div>
          )}

          {hasMultiple && currentIndex > 0 && scale === 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white/90 hover:text-white bg-black/40 rounded-full p-2"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {hasMultiple && currentIndex < effectiveGallery.length - 1 && scale === 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white/90 hover:text-white bg-black/40 rounded-full p-2"
              aria-label="Следующее фото"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div
            className="w-full h-full flex items-center justify-center p-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {lightboxUrl && (
              <img
                src={lightboxUrl}
                className="max-w-full max-h-full object-contain rounded-lg"
                alt={alt}
                draggable={false}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                  transition: dragRef.current.dragging || pinchRef.current.pinching ? 'none' : 'transform 0.15s ease-out',
                  cursor: scale > 1 ? 'grab' : 'zoom-in',
                  touchAction: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleMouseDown}
              />
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs flex items-center gap-1.5 text-center px-4">
            <ZoomIn className="w-3.5 h-3.5 shrink-0" />
            {hasMultiple ? 'Свайп или стрелки — листать. Двойной клик — увеличить' : 'Двойной клик или колесо мыши — увеличить'}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
