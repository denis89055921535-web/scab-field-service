import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, MapPin, ChevronRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';
import AssetDetail from '@/components/warehouse/AssetDetail';
import AssetEditForm from '@/components/warehouse/AssetEditForm';
import { usePartner } from '@/lib/PartnerContext';

const assetTypes = {
  bi_kit: 'Комплект БИ',
  reader_module: 'Модуль считывания',
  cabinet: 'Шкаф',
  zip_kit: 'Комплект ЗИП',
  other: 'Прочее',
};

const conditionConfig = {
  good: { label: 'Исправен', color: 'bg-green-100 text-green-800' },
  needs_repair: { label: 'Требует ремонта', color: 'bg-yellow-100 text-yellow-800' },
  broken: { label: 'Неисправен', color: 'bg-red-100 text-red-800' },
  written_off: { label: 'Списан', color: 'bg-gray-100 text-gray-500' },
};

const locationConfig = {
  warehouse: { label: 'Склад', color: 'bg-blue-100 text-blue-800' },
  crew: { label: 'Бригада', color: 'bg-purple-100 text-purple-800' },
  repair: { label: 'В ремонте', color: 'bg-orange-100 text-orange-800' },
};

export default function Warehouse() {
  const { partner } = usePartner();
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-created_date'),
  });

  const filtered = assets.filter(a => {
    const byType = filterType === 'all' || a.asset_type === filterType;
    const byLoc = filterLocation === 'all' || a.location_type === filterLocation;
    const byPartner = !partner || !a.partner || a.partner === partner;
    return byType && byLoc && byPartner;
  });

  const stats = {
    total: assets.length,
    warehouse: assets.filter(a => a.location_type === 'warehouse').length,
    crew: assets.filter(a => a.location_type === 'crew').length,
    repair: assets.filter(a => a.location_type === 'repair').length,
  };

  if (editingAsset) {
    return (
      <div className="pb-24">
        <PageHeader title="Редактирование" onBack={() => setEditingAsset(null)} />
        <div className="px-4 pt-4">
          <AssetEditForm
            asset={editingAsset}
            onSaved={(updated) => {
              setSelectedAsset(updated);
              setEditingAsset(null);
            }}
          />
        </div>
      </div>
    );
  }

  if (selectedAsset) {
    return (
      <div className="pb-24">
        <PageHeader
          title={selectedAsset.name}
          onBack={() => setSelectedAsset(null)}
          actions={
            <Button variant="ghost" size="icon" onClick={() => setEditingAsset(selectedAsset)}>
              <Pencil className="w-4 h-4" />
            </Button>
          }
        />
        <div className="px-4 pt-4">
          <AssetDetail asset={selectedAsset} />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title={partner ? `Склад — ${partner}` : 'Склад оборудования'} />

      <div className="px-4 pt-4 space-y-4">
        {/* Статистика */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'На складе', value: stats.warehouse, color: 'text-blue-600' },
            { label: 'В бригадах', value: stats.crew, color: 'text-purple-600' },
            { label: 'В ремонте', value: stats.repair, color: 'text-orange-500' },
            { label: 'Всего', value: stats.total, color: 'text-foreground' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-3 flex items-center gap-3">
              <Package className={`w-5 h-5 ${color}`} />
              <div>
                <div className="text-lg font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Фильтры */}
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(assetTypes).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Место" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все места</SelectItem>
              {Object.entries(locationConfig).map(([k, { label }]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Список */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Активы не найдены</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(asset => {
              const loc = locationConfig[asset.location_type];
              const cond = conditionConfig[asset.condition];
              return (
                <Card key={asset.id} className="p-4 cursor-pointer active:opacity-70" onClick={() => setSelectedAsset(asset)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{asset.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {assetTypes[asset.asset_type] || '—'}
                        {asset.serial_number ? ` · ${asset.serial_number}` : ''}
                      </div>
                      {asset.notes && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{asset.notes}</div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cond?.color}`}>
                          {cond?.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${loc?.color}`}>
                          {loc?.label}
                        </span>
                        {asset.location_type === 'crew' && asset.crew_number && (
                          <span className="text-xs text-muted-foreground">Бригада {asset.crew_number}</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}