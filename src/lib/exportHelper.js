import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';

// Сохраняет книгу Excel: в вебе — обычным скачиванием,
// в APK (native) — через Filesystem + системное меню "Поделиться/Сохранить".
export async function saveWorkbook(wb, fileName) {
  if (!Capacitor.isNativePlatform()) {
    XLSX.writeFile(wb, fileName);
    return;
  }

  try {
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: fileName,
      url: result.uri,
      dialogTitle: 'Сохранить или отправить отчёт',
    });
  } catch (e) {
    console.error('Ошибка сохранения Excel на устройстве:', e);
    throw e;
  }
}
