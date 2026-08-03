import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { resolvePhotoUrl } from '@/api/base44Client';
import { isLocalFile, getFileId } from '@/lib/fileService';
import { fileGet } from '@/lib/offlineDb';

// Открывает документ (PDF/Excel/др.) удобным способом:
// - в APK (нативная платформа) — через системный браузер поверх приложения (закрывается крестиком/назад)
// - в вебе — новой вкладкой
export async function openDocument(rawUrl) {
  if (!rawUrl) return;

  // Локальный файл (Blob из офлайн-хранилища) — открываем через objectURL
  if (isLocalFile(rawUrl)) {
    try {
      const rec = await fileGet(getFileId(rawUrl));
      if (rec?.blob) {
        const objUrl = URL.createObjectURL(rec.blob);
        if (Capacitor.isNativePlatform()) {
          await Browser.open({ url: objUrl });
        } else {
          window.open(objUrl, '_blank');
        }
        setTimeout(() => URL.revokeObjectURL(objUrl), 30000);
      }
    } catch (e) {
      console.error('Ошибка открытия локального файла:', e);
    }
    return;
  }

  // Серверный файл — по URL
  const url = resolvePhotoUrl(rawUrl);
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}