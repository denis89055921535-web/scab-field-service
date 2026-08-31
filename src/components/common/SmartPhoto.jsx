import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { photoGet } from '@/lib/offlineDb';
import { resolvePhotoUrl } from '@/api/base44Client';
import { isLocalPhoto, getPhotoId } from '@/lib/photoService';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function distanceBetweenTouches(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Показывает фото: серверное (по URL) или локальное (Blob из IndexedDB)
// По клику открывает фото на весь экран (лайтбокс) с возможностью увеличения:
// pinch-to-zoom и перетаскивание на тач-экранах, колесо мыши и двойной клик на десктопе.
export default function SmartPhoto({ src, className = '', alt = '', onClick, zoomable = true, fallback = null }) {
  const [displayUrl, setDisplayUrl] = useState('');
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);

  // Состояние зума/пана внутри лайтбокса
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const pinchRef = useRef({ pinching: false, startDist: 0, startScale: 1 });
  const imgWrapRef = useRef(null);

  useEffect(() => {
    setFailed(false);
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

  // Блокируем прокрутку body, когда открыт лайтбокс; сбрасываем зум при закрытии
  useEffect(() => {
    if (zoomed) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    } else {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
  }, [zoomed]);

  const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const resetZoom = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
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

  // --- Тач: pinch-to-zoom и перетаскивание одним пальцем ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        pinching: true,
        startDist: distanceBetweenTouches(e.touches),
        startScale: scale,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      dragRef.current = {
        dragging: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPosX: pos.x,
        startPosY: pos.y,
      };
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
    if (e.touches.length === 0) dragRef.current.dragging = false;
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

          <div
            ref={imgWrapRef}
            className="w-full h-full flex items-center justify-center p-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={displayUrl}
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
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs flex items-center gap-1.5">
            <ZoomIn className="w-3.5 h-3.5" />
            Двойной клик или колесо мыши — увеличить
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
