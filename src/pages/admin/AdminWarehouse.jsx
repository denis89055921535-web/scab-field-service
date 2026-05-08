import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Package, MapPin } from 'lucide-react';
import { toast } from 'sonner';

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

const emptyForm = {
  name: '', asset_type: 'bi_kit', serial_number: '', condition: 'good',
  location_type: 'warehouse', crew_number: '', notes: '',
};

export default function AdminWarehouse() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-created_date'),
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editId
      ? base44.entities.Asset.update(editId, data)
      : base44.entities.Asset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(editId ? 'Актив обновлён' : 'Актив добавлен');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Asset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Актив удалён');
    },
  });

  const openEdit = (asset) => {
    setForm({
      name: asset.name || '',
      asset_type: asset.asset_type || 'bi_kit',
      serial_number: asset.serial_number || '',
      condition: asset.condition || 'good',
      location_type: asset.location_type || 'warehouse',
      crew_number: asset.crew_number || '',
      notes: asset.notes || '',
    });
    setEditId(asset.id);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
  };

  const filtered = assets.filter(a => {
    const byType = filterType === 'all' || a.asset_type === filterType;
    const byLoc = filterLocation === 'all' || a.location_type === filterLocation;
    return byType && byLoc;
  });

  const stats = {
    total: assets.length,
    warehouse: assets.filter(a => a.location_type === 'warehouse').length,
    crew: assets.filter(a => a.location_type === 'crew').length,
    repair: assets.filter(a => a.location_type === 'repair').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Склад оборудования</h2>
        <Dialog open={open} onOpenChange={v => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-1" /> Добавить актив
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Редактирование актива' : 'Новый актив'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Название / идентификатор *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Например: БИ-001" />
              </div>
              <div>
                <Label className="text-xs">Тип оборудования *</Label>
                <Select value={form.asset_type} onValueChange={v => setForm({ ...form, asset_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(assetTypes).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Серийный номер</Label>
                <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} placeholder="SN-..." />
              </div>
              <div>
                <Label className="text-xs">Состояние *</Label>
                <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(conditionConfig).map(([k, { label }]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Местоположение *</Label>
                <Select value={form.location_type} onValueChange={v => setForm({ ...form, location_type: v, crew_number: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(locationConfig).map(([k, { label }]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.location_type === 'crew' && (
                <div>
                  <Label className="text-xs">Бригада</Label>
                  <Select value={form.crew_number} onValueChange={v => setForm({ ...form, crew_number: v })}>
                    <SelectTrigger><SelectValue placeholder="Выберите бригаду" /></SelectTrigger>
                    <SelectContent>
                      {crews.map(c => (
                        <SelectItem key={c.id} value={c.crew_number}>
                          Бригада {c.crew_number}{c.field_name ? ` — ${c.field_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Примечания</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="resize-none" />
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editId ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Всего', value: stats.total, icon: Package, color: 'text-foreground' },
          { label: 'На складе', value: stats.warehouse, icon: Package, color: 'text-blue-600' },
          { label: 'В бригадах', value: stats.crew, icon: MapPin, color: 'text-purple-600' },
          { label: 'В ремонте', value: stats.repair, icon: Package, color: 'text-orange-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <div className="text-lg font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(assetTypes).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Местоположение" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все места</SelectItem>
            {Object.entries(locationConfig).map(([k, { label }]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Серийный №</TableHead>
                <TableHead>Состояние</TableHead>
                <TableHead>Местоположение</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Загрузка...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Активы не найдены</TableCell></TableRow>
              ) : filtered.map(asset => {
                const loc = locationConfig[asset.location_type];
                const cond = conditionConfig[asset.condition];
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{assetTypes[asset.asset_type] || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{asset.serial_number || '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cond?.color}`}>
                        {cond?.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${loc?.color}`}>
                          {loc?.label}
                        </span>
                        {asset.location_type === 'crew' && asset.crew_number && (
                          <span className="text-xs text-muted-foreground">Бригада {asset.crew_number}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(asset)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(asset.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}