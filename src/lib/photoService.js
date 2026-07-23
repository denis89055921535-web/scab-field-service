import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { photoSave, genId } from '@/lib/offlineDb';
import { checkOnline } from '@/lib/network';
import { base44 } from '@/api/base44Client';

// Сжатие изображения: уменьшаем до maxSize по большей стороне
async function compressImage(blob, maxSize = 1600, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (result) => resolve(result || blob),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

// Съёмка фото: нативная камера в APK, выбор файла в браузере
export async function capturePhoto() {
  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Фото',
      promptLabelPhoto: 'Выбрать из галереи',
      promptLabelPicture: 'Сделать снимок',
    });
    const response = await fetch(photo.webPath);
    return await response.blob();
  }
  // Браузер: открываем выбор файла
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) resolve(file);
      else reject(new Error('Файл не выбран'));
    };
    input.click();
  });
}

// Обработать фото: сжать, сохранить (локально или на сервер), вернуть ссылку
export async function processPhoto(blob) {
  const compressed = await compressImage(blob);
  const online = await checkOnline();

  if (online) {
    // Онлайн — сразу на сервер
    const file = new File([compressed], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const result = await base44.integrations.Core.UploadFile({ file });
    return { url: result.file_url, local: false };
  }

  // Офлайн — сохраняем локально
  const photoId = genId();
  await photoSave(photoId, compressed);
  return { url: `local-photo://${photoId}`, local: true, photoId };
}

// Полный цикл: снять и обработать
export async function takeAndSavePhoto() {
  const blob = await capturePhoto();
  return await processPhoto(blob);
}

// Проверка: локальная ли это ссылка на фото
export function isLocalPhoto(url) {
  return typeof url === 'string' && url.startsWith('local-photo://');
}

// Получить photoId из локальной ссылки
export function getPhotoId(url) {
  return isLocalPhoto(url) ? url.replace('local-photo://', '') : null;
}

// Загружает все локальные фото отчёта на сервер, заменяя ссылки на реальные URL
export async function uploadLocalPhotos(tripData) {
  const { photoGet, photoRemove } = await import('@/lib/offlineDb');
  const data = { ...tripData };

  // Вспомогательная: загрузить одно фото по локальной ссылке
  const uploadOne = async (url) => {
    if (!isLocalPhoto(url)) return url;
    const photoId = getPhotoId(url);
    const blob = await photoGet(photoId);
    if (!blob) return url; // фото потерялось — оставляем как есть
    const file = new File([blob], `photo_${photoId}.jpg`, { type: 'image/jpeg' });
    const result = await base44.integrations.Core.UploadFile({ file });
    await photoRemove(photoId);
    return result.file_url;
  };

  // Общий фотоотчёт
  if (Array.isArray(data.photos) && data.photos.length) {
    data.photos = await Promise.all(data.photos.map(uploadOne));
  }

  // Фото внутри чек-листа (sections)
  if (data.sections && typeof data.sections === 'object') {
    const sections = { ...data.sections };
    for (const [sectionKey, sectionData] of Object.entries(sections)) {
      if (!sectionData || typeof sectionData !== 'object') continue;
      const updated = { ...sectionData };

      // Фото по полям
      if (updated.photos && typeof updated.photos === 'object') {
        const fieldPhotos = { ...updated.photos };
        for (const [fieldKey, urls] of Object.entries(fieldPhotos)) {
          if (Array.isArray(urls)) {
            fieldPhotos[fieldKey] = await Promise.all(urls.map(uploadOne));
          }
        }
        updated.photos = fieldPhotos;
      }

      // Фото на уровне секции
      if (Array.isArray(updated.sectionPhotos)) {
        updated.sectionPhotos = await Promise.all(updated.sectionPhotos.map(uploadOne));
      }

      sections[sectionKey] = updated;
    }
    data.sections = sections;
  }

  return data;
}
