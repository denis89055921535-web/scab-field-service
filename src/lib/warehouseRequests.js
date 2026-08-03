export const requestTypeConfig = {
  movement: {
    label: 'Перемещение',
    fullLabel: 'Заявка на перемещение',
  },
  purchase: {
    label: 'Приобретение',
    fullLabel: 'Заявка на приобретение',
  },
};

export const purchaseApprovalSteps = [
  { key: 'admin', label: 'Администратор' },
  { key: 'service_manager', label: 'Руководитель Службы' },
  { key: 'project_manager', label: 'Руководитель проекта' },
];

export const requestStatusConfig = {
  draft: { label: 'Черновик', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  submitted: { label: 'На согласовании', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  approved: { label: 'Согласована', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  in_progress: { label: 'В работе', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  in_transit: { label: 'В перемещении', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  ordered: { label: 'Заказана', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  completed: { label: 'Выполнена', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  received: { label: 'Получена', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  rejected: { label: 'Отклонена', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  cancelled: { label: 'Отменена', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export const assetTypeOptions = [
  { value: 'bi_kit', label: 'Комплект БИ' },
  { value: 'reader_module', label: 'Модуль считывания' },
  { value: 'cabinet', label: 'Шкаф' },
  { value: 'zip_kit', label: 'Комплект ЗИП' },
  { value: 'tsd', label: 'ТСД' },
  { value: 'other', label: 'Прочее' },
];

export const locationOptions = [
  { value: 'warehouse', label: 'На склад' },
  { value: 'crew', label: 'В бригаду' },
  { value: 'repair', label: 'В ремонт' },
];

export const locationLabels = {
  warehouse: 'Склад',
  crew: 'Бригада',
  repair: 'Ремонт',
};

export function formatRequestLocation(type, crewNumber) {
  if (type === 'crew') return crewNumber ? `Бригада №${crewNumber}` : 'Бригада';
  return locationLabels[type] || 'Не указано';
}

export function formatRequestDate(value) {
  if (!value) return '—';
  const datePart = String(value).split('T')[0];
  const [year, month, day] = datePart.split('-');
  return year && month && day ? `${day}.${month}.${year}` : String(value);
}
