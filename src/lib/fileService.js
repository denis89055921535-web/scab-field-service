import { fileSave, fileGet, fileRemove, genId } from '@/lib/offlineDb';
import { checkOnline } from '@/lib/network';
import { base44 } from '@/api/base44Client';

export async function selectFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.pdf,application/pdf';
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) resolve(file);
      else reject(new Error('Файл не выбран'));
    };
    input.click();
  });
}

export async function processFile(file) {
  const online = await checkOnline();
  if (online) {
    const result = await base44.integrations.Core.UploadFile({ file });
    return { url: result.file_url, name: file.name, local: false };
  }
  const fileId = genId();
  await fileSave(fileId, file, { name: file.name, type: file.type });
  return { url: 'local-file://' + fileId, name: file.name, local: true, fileId };
}

export async function attachFile() {
  const file = await selectFile();
  return await processFile(file);
}

export function isLocalFile(url) {
  return typeof url === 'string' && url.startsWith('local-file://');
}

export function getFileId(url) {
  return isLocalFile(url) ? url.replace('local-file://', '') : null;
}

export async function uploadLocalFiles(tripData) {
  const data = { ...tripData };
  const uploadOne = async (attachment) => {
    if (!attachment || !isLocalFile(attachment.url)) return attachment;
    const fileId = getFileId(attachment.url);
    const rec = await fileGet(fileId);
    if (!rec) return attachment;
    const file = new File([rec.blob], attachment.name || 'file', { type: (rec.meta && rec.meta.type) || '' });
    const result = await base44.integrations.Core.UploadFile({ file });
    await fileRemove(fileId);
    return { url: result.file_url, name: attachment.name };
  };
  if (data.sections && typeof data.sections === 'object') {
    const sections = { ...data.sections };
    for (const [sectionKey, sectionData] of Object.entries(sections)) {
      if (!sectionData || typeof sectionData !== 'object') continue;
      if (!sectionData.files || typeof sectionData.files !== 'object') continue;
      const updated = { ...sectionData };
      const files = { ...updated.files };
      for (const [fieldKey, attachment] of Object.entries(files)) {
        files[fieldKey] = await uploadOne(attachment);
      }
      updated.files = files;
      sections[sectionKey] = updated;
    }
    data.sections = sections;
  }
  return data;
}