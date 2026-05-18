import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { jsPDF } from 'jspdf';
import { CHECKLIST_SECTIONS } from '@/components/trips/ChecklistSection';

const TRIP_STATUS_LABELS = {
  draft: 'Черновик',
  in_progress: 'В работе',
  completed: 'Завершен',
  needs_repeat: 'Требуется повторный выезд',
  planned: 'Запланирован',
};

const WORK_TYPE_LABELS = {
  maintenance: 'Обслуживание оборудования',
  bi_accident: 'Авария БИ',
  bi_inspection: 'Инспекция БИ',
  equipment_install: 'Монтаж оборудования',
  equipment_uninstall: 'Демонтаж оборудования',
};

function getChecklistRows(sections = {}) {
  const rows = [];
  CHECKLIST_SECTIONS.forEach(section => {
    const sectionData = sections[section.key] || {};
    const answers = sectionData.answers || {};
    const comments = sectionData.comments || {};
    section.fields.forEach(field => {
      let answer = answers[field.key];
      if (field.type === 'count') {
        answer = answer ? `${answer} антенн` : '—';
      } else {
        answer = answer === 'yes' ? 'Да' : answer === 'no' ? 'Нет' : '—';
      }
      rows.push({
        Раздел: section.title,
        Пункт: field.label,
        Ответ: answer,
        Комментарий: comments[field.key] || sectionData.comment || '',
      });
    });
  });
  return rows;
}

export function exportToExcel(trip) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: General info
  const infoData = [
    ['Дата выезда', trip.trip_date || ''],
    ['ФИО сотрудника', trip.employee_name || ''],
    ['Должность', trip.position || ''],
    ['№ буровой бригады', trip.crew_number || ''],
    ['Месторождение', trip.field_name || ''],
    ['Тип буровой установки', trip.drill_type || ''],
    ['Тип работ', WORK_TYPE_LABELS[trip.work_type] || trip.work_type || ''],
    ['Комплект БИ', trip.bi_kits_numbers || ''],
    ['Причина выезда', trip.reason || ''],
    ['Статус', TRIP_STATUS_LABELS[trip.status] || trip.status || ''],
    ['Комментарий', trip.comment || ''],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(infoData);
  ws1['!cols'] = [{ wch: 28 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Общая информация');

  // Sheet 2: Checklist
  const checklistRows = getChecklistRows(trip.sections);
  const ws2 = XLSX.utils.json_to_sheet(checklistRows);
  ws2['!cols'] = [{ wch: 30 }, { wch: 55 }, { wch: 10 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Чек-лист');

  const fileName = `Отчет_выезд_${trip.crew_number || 'бригада'}_${trip.trip_date || 'дата'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportToPDF(trip) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Use built-in font (no cyrillic support in jsPDF without custom fonts)
  // We'll transliterate labels but keep values — or use a simple approach:
  // Build content as text lines
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  const line = (text, bold = false, size = 10) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(String(text || ''), pageW - margin * 2);
    lines.forEach(l => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(l, margin, y);
      y += size * 0.45;
    });
  };

  const separator = () => {
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  // Title
  line('Trip Report / Otchet o vyezde', true, 14);
  y += 4;
  separator();

  // Info
  const info = [
    ['Data vyezda', trip.trip_date],
    ['FIO sotrudnika', trip.employee_name],
    ['Dolzhnost', trip.position],
    ['Brigada', trip.crew_number],
    ['Mestorozhdenie', trip.field_name],
    ['Tip burovoy', trip.drill_type],
    ['Tip rabot', WORK_TYPE_LABELS[trip.work_type] || trip.work_type],
    ['Komplekt BI', trip.bi_kits_numbers],
    ['Prichina vyezda', trip.reason],
    ['Status', TRIP_STATUS_LABELS[trip.status] || trip.status],
    ['Kommentariy', trip.comment],
  ];

  info.forEach(([label, value]) => {
    if (value) line(`${label}: ${value}`);
  });

  y += 5;
  separator();
  line('Chek-list / Checklist', true, 11);
  y += 3;

  const checklistRows = getChecklistRows(trip.sections);
  let currentSection = '';
  checklistRows.forEach(row => {
    if (row['Раздел'] !== currentSection) {
      currentSection = row['Раздел'];
      y += 2;
      line(`[${currentSection}]`, true, 9);
    }
    const comment = row['Комментарий'] ? ` (${row['Комментарий']})` : '';
    line(`  ${row['Пункт']}: ${row['Ответ']}${comment}`, false, 8);
  });

  const fileName = `Otchet_vyezd_${trip.crew_number || 'brigada'}_${trip.trip_date || 'data'}.pdf`;
  doc.save(fileName);
}

export function exportSummaryToExcel(trips) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: summary
  const rows = trips.map(trip => ({
    'Дата выезда': trip.trip_date || '',
    'Бригада №': trip.crew_number || '',
    'Месторождение': trip.field_name || '',
    'ФИО сотрудника': trip.employee_name || '',
    'Должность': trip.position || '',
    'Тип буровой': trip.drill_type || '',
    'Тип работ': WORK_TYPE_LABELS[trip.work_type] || trip.work_type || '',
    'Комплект БИ': trip.bi_kits_numbers || '',
    'Причина выезда': trip.reason || '',
    'Модуль считывания': trip.module_type || '',
    'Шкаф': trip.cabinet_type || '',
    'Статус выезда': TRIP_STATUS_LABELS[trip.status] || trip.status || '',
    'Комментарий': trip.comment || '',
  }));

  const ws1 = XLSX.utils.json_to_sheet(rows);
  ws1['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 28 }, { wch: 20 },
    { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 30 }, { wch: 18 },
    { wch: 14 }, { wch: 20 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Сводный отчёт');

  // Sheet 2: checklists for all trips
  const checklistRows = [];
  trips.forEach(trip => {
    const tripLabel = `${trip.trip_date || '—'} / Бригада №${trip.crew_number || '—'} / ${trip.employee_name || '—'}`;
    CHECKLIST_SECTIONS.forEach(section => {
      const sectionData = trip.sections?.[section.key] || {};
      const answers = sectionData.answers || {};
      const comments = sectionData.comments || {};
      section.fields.forEach(field => {
        let answer = answers[field.key];
        if (field.type === 'count') {
          answer = answer ? `${answer} антенн` : '—';
        } else {
          answer = answer === 'yes' ? 'Да' : answer === 'no' ? 'Нет' : '—';
        }
        checklistRows.push({
          'Выезд': tripLabel,
          'Раздел': section.title,
          'Пункт': field.label,
          'Ответ': answer,
          'Комментарий': comments[field.key] || sectionData.comment || '',
        });
      });
    });
  });

  const ws2 = XLSX.utils.json_to_sheet(checklistRows);
  ws2['!cols'] = [{ wch: 45 }, { wch: 30 }, { wch: 55 }, { wch: 10 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Чек-листы');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Сводный_отчёт_выезды_${today}.xlsx`);
}

export async function sendReportByEmail(trip, toEmail) {
  const checklistRows = getChecklistRows(trip.sections);
  const checklistHtml = CHECKLIST_SECTIONS.map(section => {
    const sectionData = trip.sections?.[section.key] || {};
    const answers = sectionData.answers || {};
    const comments = sectionData.comments || {};
    const rows = section.fields.map(f => {
      let ans = answers[f.key];
      if (f.type === 'count') ans = ans ? `${ans} антенн` : '—';
      else ans = ans === 'yes' ? '✅ Да' : ans === 'no' ? '❌ Нет' : '—';
      const comment = comments[f.key] || '';
      return `<tr><td style="padding:4px 8px;border:1px solid #ddd">${f.label}</td><td style="padding:4px 8px;border:1px solid #ddd">${ans}</td><td style="padding:4px 8px;border:1px solid #ddd;color:#666">${comment}</td></tr>`;
    }).join('');
    return `<h4 style="margin:12px 0 4px">${section.title}</h4><table style="border-collapse:collapse;width:100%;font-size:13px"><tr style="background:#f5f5f5"><th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Пункт</th><th style="padding:4px 8px;border:1px solid #ddd">Ответ</th><th style="padding:4px 8px;border:1px solid #ddd">Комментарий</th></tr>${rows}</table>`;
  }).join('');

  const body = `
<h2>Отчёт о выезде — Бригада №${trip.crew_number || '—'}</h2>
<table style="font-size:14px;border-collapse:collapse">
  <tr><td style="padding:3px 12px 3px 0;color:#666">Дата выезда:</td><td><strong>${trip.trip_date || '—'}</strong></td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Сотрудник:</td><td>${trip.employee_name || '—'}${trip.position ? `, ${trip.position}` : ''}</td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Месторождение:</td><td>${trip.field_name || '—'}</td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Тип буровой:</td><td>${trip.drill_type || '—'}</td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Статус:</td><td>${TRIP_STATUS_LABELS[trip.status] || trip.status || '—'}</td></tr>
  <tr><td style="padding:3px 12px 3px 0;color:#666">Причина выезда:</td><td>${trip.reason || '—'}</td></tr>
</table>
<hr style="margin:16px 0">
<h3>Чек-лист полевого сотрудника АРБИ</h3>
${checklistHtml}
${trip.comment ? `<hr style="margin:16px 0"><p><strong>Комментарий:</strong> ${trip.comment}</p>` : ''}
`;

  const user = await base44.auth.me();
  if (!user?.email) throw new Error('Email пользователя не определён');

  await base44.integrations.Core.SendEmail({
    to: user.email,
    subject: `Отчёт о выезде — Бригада №${trip.crew_number || '—'} — ${trip.trip_date || ''}`,
    body,
  });
}