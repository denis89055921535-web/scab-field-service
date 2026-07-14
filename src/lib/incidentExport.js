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

  const token = localStorage.getItem('auth_token');
  const response = await fetch('https://scabpro.com/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      subject: `Отчёт об аварии — ${form.object_name || '—'} — ${fmt(form.incident_date)}`,
      body: body.replace(/\n/g, '<br>'),
    })
  });
  if (!response.ok) throw new Error('Ошибка отправки email');
}