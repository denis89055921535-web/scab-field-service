import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import { usePartner } from '@/lib/PartnerContext';
import { toast } from 'sonner';

const assetTypes = {
  bi_kit: 'Комплект БИ',
  reader_module: 'Модуль считывания',
  cabinet: 'Шкаф',
  zip_kit: 'Комплект ЗИП',
  other: 'Прочее',
};

const conditionOptions = [
  { value: 'working', label: 'В работе' },
  { value: 'not_working', label: 'Не в работе' },
];

const locationOptions = [
  { value: 'warehouse', label: 'Склад' },
  { value: 'crew', label: 'Бригада' },
  { value: 'repair', label: 'В ремонте' },
];

const PARTNERS = ['ИНК', 'Газпром Бурение', 'МУБР'];

export default function AssetEditForm({ asset, onSaved }) {
  const { partner } = usePartner();
  const [form, setForm] = useState({ ...asset, partner: asset.partner || partner || '' });
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => base44.entities.Asset.update(asset.id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Оборудование обновлено');
      onSaved(updated || { ...asset, ...form });
    },
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Label className="text-xs">Название *</Label>
        <Input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Название оборудования" />
      </div>

      <div>
        <Label className="text-xs">Тип оборудования</Label>
        <Select value={form.asset_type || ''} onValueChange={v => set('asset_type', v)}>
          <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
          <SelectContent>
            {Object.entries(assetTypes).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Серийный номер</Label>
        <Input value={form.serial_number || ''} onChange={e => set('serial_number', e.target.value)} placeholder="Серийный номер" />
      </div>

      <div>
        <Label className="text-xs">Производитель</Label>
        <Input value={form.manufacturer || ''} onChange={e => set('manufacturer', e.target.value)} placeholder="Производитель" />
      </div>

      <div>
        <Label className="text-xs">Состояние</Label>
        <Select value={form.condition || ''} onValueChange={v => set('condition', v)}>
          <SelectTrigger><SelectValue placeholder="Выберите состояние" /></SelectTrigger>
          <SelectContent>
            {conditionOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Местоположение</Label>
        <Select value={form.location_type || ''} onValueChange={v => set('location_type', v)}>
          <SelectTrigger><SelectValue placeholder="Выберите местоположение" /></SelectTrigger>
          <SelectContent>
            {locationOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.location_type === 'crew' && (
        <div>
          <Label className="text-xs">№ бригады</Label>
          <Input value={form.crew_number || ''} onChange={e => set('crew_number', e.target.value)} placeholder="Номер бригады" />
        </div>
      )}

      <div>
        <Label className="text-xs">Дата ввода в работу</Label>
        <Input type="date" value={form.commissioned_date || ''} onChange={e => set('commissioned_date', e.target.value)} />
      </div>

      <div>
        <Label className="text-xs">Дата последней инспекции</Label>
        <Input type="date" value={form.last_inspection_date || ''} onChange={e => set('last_inspection_date', e.target.value)} />
      </div>

      <div>
        <Label className="text-xs">Партнёр</Label>
        <Select value={form.partner || ''} onValueChange={v => set('partner', v)}>
          <SelectTrigger><SelectValue placeholder="Выберите партнёра" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Не указан</SelectItem>
            {PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Примечания</Label>
        <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Примечания..." rows={3} />
      </div>

      <Button className="w-full h-11" onClick={() => mutate(form)} disabled={isPending || !form.name}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Сохранить
      </Button>
    </div>
  );
}