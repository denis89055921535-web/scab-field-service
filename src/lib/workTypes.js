// Общая логика для поля "Тип работ" — поддерживает несколько значений
// плюс произвольный текст для "Другие типы работ".
// Хранится как JSON-строка массива в текстовом поле work_type (без миграции БД).
// Обратная совместимость: старые записи с одиночным значением или списком через запятую
// по-прежнему корректно читаются.

export const WORK_TYPE_OPTIONS = [
  { value: 'maintenance_work_position', label: 'Обслуживание оборуд. (перевод в рабочее положение)' },
  { value: 'maintenance_service_position', label: 'Обслуживание оборуд. (перевод в сервисное положение)' },
  { value: 'bi_accident', label: 'Авария БИ' },
  { value: 'bi_inspection', label: 'Инспекция/Перечиповка БИ' },
  { value: 'equipment_install', label: 'Монтаж оборуд.' },
  { value: 'equipment_uninstall', label: 'Демонтаж оборуд.' },
];

export const OTHER_PREFIX = 'other:';

export function parseWorkTypes(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { /* не JSON — старый формат */ }
  return String(raw).split(',').filter(Boolean);
}

export function serializeWorkTypes(arr) {
  return JSON.stringify((arr || []).filter(Boolean));
}

export function formatWorkTypes(raw, labelsMap) {
  const arr = parseWorkTypes(raw);
  return arr
    .map(function (item) {
      if (item.startsWith(OTHER_PREFIX)) return item.slice(OTHER_PREFIX.length);
      return (labelsMap && labelsMap[item]) || item;
    })
    .filter(Boolean)
    .join(', ');
}
