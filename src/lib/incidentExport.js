import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function exportIncidentToExcel(form) {
  const fmt = (d) => d ? format(new Date(d), 'dd.MM.yyyy') : '—';

  const rows = [
    ['Поле', 'Значение'],
    ['Дата аварии', fmt(form.incident_date)],
    ['Объект', form.object_name || '—'],
    ['Комплект БИ', form.bi_kit_number || '—'],
    ['Номер трубы', form.pipe_number || '—'],
    ['Номер RFID-метки', form.rfid_tag_number || '—'],
    ['Дата последней инспекции', fmt(form.last_inspection_date)],
    ['Комментарий', form.comment || '—'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Авария');

  const fileName = `avaria_${form.object_name || 'otchet'}_${fmt(form.incident_date)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function sendIncidentByEmail(form, email) {
  const fmt = (d) => d ? format(new Date(d), 'dd.MM.yyyy') : '—';

  const body = `
Отчёт об аварии

Дата аварии: ${fmt(form.incident_date)}
Объект: ${form.object_name || '—'}
Комплект БИ: ${form.bi_kit_number || '—'}
Номер трубы: ${form.pipe_number || '—'}
Номер RFID-метки: ${form.rfid_tag_number || '—'}
Дата последней инспекции: ${fmt(form.last_inspection_date)}
Комментарий: ${form.comment || '—'}
Количество фото: ${form.photos?.length || 0}
  `.trim();

  const { base44 } = await import('@/api/base44Client');
  const user = await base44.auth.me();
  if (!user?.email) throw new Error('Email пользователя не определён');

  await base44.integrations.Core.SendEmail({
    to: user.email,
    subject: `Авария: ${form.object_name || '—'} от ${fmt(form.incident_date)}`,
    body,
  });
}