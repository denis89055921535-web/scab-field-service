export const crewStatuses = {
  moving: { label: 'В переезде', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  drilling_start: { label: 'Забурка', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  waiting_install: { label: 'Ожидание монтажа', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  dismount: { label: 'Демонтаж', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  in_work: { label: 'В работе с нашим СБТ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  no_rfid: { label: 'В работе без RFID', color: 'bg-red-100 text-red-700 border-red-200' },
};

export const tripStatuses = {
  planned: { label: 'Запланирован', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'В работе', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed: { label: 'Завершен', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  needs_repeat: { label: 'Повторный выезд', color: 'bg-red-100 text-red-700 border-red-200' },
};

export const categoryLabels = {
  rfid: 'RFID',
  equipment: 'Оборудование',
  regulations: 'Регламенты',
  safety: 'Безопасность',
  software: 'ПО',
  other: 'Прочее',
};

export const checklistItems = [
  { key: 'rfid_check', label: 'Проверка RFID-оборудования' },
  { key: 'bi_kit_check', label: 'Проверка комплекта БИ' },
  { key: 'connection_check', label: 'Проверка связи' },
  { key: 'module_check', label: 'Проверка модуля' },
  { key: 'cabinet_check', label: 'Проверка шкафов' },
  { key: 'power_check', label: 'Проверка питания' },
  { key: 'data_transfer_check', label: 'Проверка передачи данных' },
  { key: 'photo_done', label: 'Фотофиксация выполнена' },
  { key: 'briefing_done', label: 'Инструктаж персонала выполнен' },
];