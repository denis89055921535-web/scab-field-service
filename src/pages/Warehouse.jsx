import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ChevronRight, Pencil, Download, Boxes, ScanLine, Server, Wrench, ScanBarcode } from 'lucide-react';
import * as XLSX from 'xlsx';
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
  tsd: 'ТСД',
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
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', partner],
    queryFn: () => partner
      ? base44.entities.Asset.filter({ partner }, '-created_date')
      : base44.entities.Asset.list('-created_date'),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', partner],
    queryFn: () => partner ? base44.entities.Warehouse.filter({ partner }) : Promise.resolve([]),
    enabled: !!partner,
  });

  const filtered = assets.filter(a => {
    const byType = filterType === 'all' || a.asset_type === filterType;
    const byLoc = filterLocation === 'all' || a.location_type === filterLocation;
    const byWarehouse = filterWarehouse === 'all' || a.warehouse_name === filterWarehouse;
    return byType && byLoc && byWarehouse;
  });

  const exportToExcel = () => {
    const rows = assets.map(a => ({
      'Название': a.name,
      'Тип': assetTypes[a.asset_type] || a.asset_type,
      'Серийный номер': a.serial_number || '',
      'Производитель': a.manufacturer || '',
      'Состояние': a.condition === 'working' ? 'Исправен' : 'Неисправен',
      'Местонахождение': locationConfig[a.location_type]?.label || a.location_type,
      'Бригада': a.crew_number || '',
      'Дата ввода': a.commissioned_date || '',
      'Последняя проверка': a.last_inspection_date || '',
      'Примечания': a.notes || '',
      'Партнёр': a.partner || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Склад');
    XLSX.writeFile(wb, `Склад_${partner || 'все'}_${new Date().toLocaleDateString('ru-RU')}.xlsx`);
  };

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
          <AssetDetail
            asset={selectedAsset}
            onUpdate={async (fields) => {
              try {
                const updated = await base44.entities.Asset.update(selectedAsset.id, { ...selectedAsset, ...fields });
                setSelectedAsset(prev => ({ ...prev, ...fields }));
              } catch (err) {
                console.error('Ошибка сохранения документов:', err);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title={partner ? `Склад — ${partner}` : 'Склад оборудования'}
        actions={
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={assets.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
        }
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Локации — кликабельные карточки */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'warehouse', label: 'На складе', value: stats.warehouse, color: 'text-blue-600' },
            { key: 'crew', label: 'В бригадах', value: stats.crew, color: 'text-purple-600' },
            { key: 'repair', label: 'В ремонте', value: stats.repair, color: 'text-orange-500' },
            { key: 'all', label: 'Всего', value: stats.total, color: 'text-foreground' },
          ].map(({ key, label, value, color }) => (
            <Card
              key={label}
              onClick={() => { setFilterLocation(key === filterLocation ? 'all' : key); setFilterWarehouse('all'); }}
              className={`p-3 flex items-center gap-3 cursor-pointer transition-all active:opacity-70 ` + (filterLocation === key && key !== 'all' ? 'ring-2 ring-primary' : '')}
            >
              <Package className={`w-5 h-5 ` + color} />
              <div>
                <div className="text-lg font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </Card>
          ))}
        </div>
        {filterLocation === 'warehouse' && warehouses.length > 0 && (
          <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
            <SelectTrigger><SelectValue placeholder="Выберите склад" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все склады</SelectItem>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {/* Типы — кликабельные плитки */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'bi_kit', label: 'Комплект БИ', Icon: Boxes },
            { key: 'reader_module', label: 'Модуль считывания', Icon: ScanLine },
            { key: 'cabinet', label: 'Шкаф', Icon: Server },
            { key: 'zip_kit', label: 'Комплект ЗИП', Icon: Wrench },
            { key: 'tsd', label: 'ТСД', Icon: ScanBarcode },
            { key: 'other', label: 'Прочее', Icon: Package },
          ].map(({ key, label, Icon }) => (
            <Card
              key={key}
              onClick={() => setFilterType(key === filterType ? 'all' : key)}
              className={`p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:opacity-70 text-center min-h-[84px] ` + (filterType === key ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary')}
            >
              <Icon className={`w-6 h-6 ` + (filterType === key ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-xs font-medium leading-tight">{label}</div>
            </Card>
          ))}
        </div>
        {/* Список */}
        {(filterType === 'all' && filterLocation === 'all') ? (
          <div className="text-center text-muted-foreground py-12">Выберите категорию, чтобы увидеть оборудование</div>
        ) : isLoading ? (
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
                        {asset.location_type === 'warehouse' && asset.warehouse_name && (
                          <span className="text-xs text-muted-foreground">{asset.warehouse_name}</span>
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