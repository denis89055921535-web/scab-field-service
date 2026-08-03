import { formatRequestLocation } from '@/lib/warehouseRequests';

const urgencyLabels = {
  normal: 'Обычный',
  high: 'Высокий',
  critical: 'Критический',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function row(label, value) {
  return `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(label)}:</td><td style="padding:4px 0"><strong>${escapeHtml(value || '—')}</strong></td></tr>`;
}

export async function sendEquipmentRequestByEmail(request) {
  const isMovement = request.request_type === 'movement';
  const requestLabel = isMovement ? 'перемещение оборудования' : 'приобретение оборудования';
  const number = request.request_number || request.id || 'без номера';

  const movementRows = isMovement
    ? [
        row('Оборудование', request.asset_name),
        row('Серийный номер', request.serial_number),
        row('Откуда', formatRequestLocation(request.source_location_type, request.source_crew_number)),
        row('Куда', formatRequestLocation(request.destination_type, request.destination_crew_number)),
      ].join('')
    : row(
        'Позиции',
        (request.items || []).map(item => `${item.name || 'Без названия'} — ${item.quantity || 1} ${item.unit || 'шт.'}`).join('; ')
      );

  const body = `
    <h2>Заявка на ${requestLabel}</h2>
    <table style="font-size:14px;border-collapse:collapse">
      ${row('Номер заявки', number)}
      ${row('Компания', request.partner)}
      ${row('Заявитель', request.requested_by_name)}
      ${row('Email заявителя', request.requested_by_email)}
      ${row('Email получателя', request.recipient_email)}
      ${movementRows}
      ${row('Приоритет', urgencyLabels[request.urgency] || request.urgency)}
      ${row('Желаемая дата', request.desired_date)}
      ${row('Причина', request.reason)}
      ${row('Комментарий', request.comment)}
    </table>
  `;

  const token = localStorage.getItem('auth_token');
  const response = await fetch('https://scabpro.com/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: request.recipient_email || undefined,
      subject: `Заявка на ${requestLabel} — ${request.partner || 'SCAB'} — ${number}`,
      body,
    }),
  });

  if (!response.ok) throw new Error('Не удалось отправить заявку на email');
}
