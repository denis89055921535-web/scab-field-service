import { Card, CardContent } from '@/components/ui/card';
import { Package, MapPin, Hash, Wrench, Calendar, Building2, FileText, Users } from 'lucide-react';

const assetTypes = {
  bi_kit: 'Комплект БИ',
  reader_module: 'Модуль считывания',
  cabinet: 'Шкаф',
  zip_kit: 'Комплект ЗИП',
  other: 'Прочее',
};

const conditionConfig = {
  working: { label: 'В работе', color: 'bg-green-100 text-green-800' },
  not_working: { label: 'Не в работе', color: 'bg-red-100 text-red-800' },
};

const locationConfig = {
  warehouse: { label: 'Склад', color: 'bg-blue-100 text-blue-800' },
  crew: { label: 'Бригада', color: 'bg-purple-100 text-purple-800' },
  repair: { label: 'В ремонте', color: 'bg-orange-100 text-orange-800' },
};

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <span className="text-sm text-muted-foreground w-36 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function AssetDetail({ asset }) {
  const cond = conditionConfig[asset.condition];
  const loc = locationConfig[asset.location_type];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xl font-bold">{asset.name}</h2>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {cond && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cond.color}`}>
              {cond.label}
            </span>
          )}
          {loc && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${loc.color}`}>
              {loc.label}
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <InfoRow icon={Package} label="Тип оборудования" value={assetTypes[asset.asset_type]} />
          <InfoRow icon={Hash} label="Серийный номер" value={asset.serial_number} />
          <InfoRow icon={Building2} label="Производитель" value={asset.manufacturer} />
          <InfoRow icon={Calendar} label="Дата ввода в работу" value={formatDate(asset.commissioned_date)} />
          <InfoRow icon={MapPin} label="Бригада" value={asset.location_type === 'crew' && asset.crew_number ? `Бригада ${asset.crew_number}` : null} />
          <InfoRow icon={Wrench} label="Последняя инспекция" value={formatDate(asset.last_inspection_date)} />
          <InfoRow icon={Users} label="Партнёр" value={asset.partner} />
          <InfoRow icon={FileText} label="Примечания" value={asset.notes} />
        </CardContent>
      </Card>
    </div>
  );
}