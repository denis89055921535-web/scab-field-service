import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';

export function exportIncidentToExcel(incident) {
  const wb = XLSX.utils.book_new();

  const infoData = [
    ['Дата аварии', incident.incident_date || ''],
    ['Объект', incident.object_name || ''],
    ['Комплект БИ', incident.bi_kit_number || ''],
    ['Номер трубы', incident.pipe_number || ''],
    ['Номер RFID-метки', incident.rfid_tag_number || ''],
    ['Дата последней инспекции', incident.last_inspection_date || ''],
    ['Комментарий', incident.comment || ''],
    ['Фотографий', (incident.photos?.length || 0)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(infoData);
  ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Авария');

  const fileName = `Авария_${incident.object_name || 'объект'}_${incident.incident_date || 'дата'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function sendIncidentByEmail(incident, toEmail) {
  const photosHtml = incident.photos?.length
    ? `<p><strong>Фотографий прикреплено:</strong> ${incident.photos.length}</p>`
    : '';

  const body = `
<h2>Отчёт об аварии</h2>
<table style="font-size:14px;border-collapse:collapse">
  <tr><td style="padding:3px 12px 3px 0;color:#666">Дата аварии:</td><td><strong>${incident.incident_date || '—'}</strong></td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Объект:</td><td>${incident.object_name || '—'}</td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Комплект БИ:</td><td>${incident.bi_kit_number || '—'}</td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Номер трубы:</td><td>${incident.pipe_number || '—'}</td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Номер RFID-метки:</td><td>${incident.rfid_tag_number || '—'}</td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Дата последней инспекции:</td><td>${incident.last_inspection_date || '—'}</td></tr>
</table>
${incident.comment ? `<hr style="margin:16px 0"><p><strong>Комментарий:</strong> ${incident.comment}</p>` : ''}
${photosHtml}
`;

  await base44.integrations.Core.SendEmail({
    to: toEmail,
    subject: `Отчёт об аварии — ${incident.object_name || '—'} — ${incident.incident_date || ''}`,
    body,
  });
}