import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/common/StatusBadge';
import { crewStatuses } from '@/lib/statusConfig';


const emptyForm = {
  crew_number: '', drill_type: '', field_name: '', bi_kits_numbers: '', 
  has_internet: false, module_type: '', cabinet_type: '', status: 'in_work', photo_url: ''
};

export default function AdminCrews() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);


  const { data: crews = [], isLoading } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (editId) return base44.entities.DrillingCrew.update(editId, payload);
      return base44.entities.DrillingCrew.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      toast.success(editId ? 'Бригада обновлена' : 'Бригада добавлена');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DrillingCrew.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      toast.success('Бригада удалена');
    },
  });

  const openEdit = (crew) => {
    setForm({
      crew_number: crew.crew_number || '',
      drill_type: crew.drill_type || '',
      field_name: crew.field_name || '',
      bi_kits_numbers: crew.bi_kits_numbers || '',
      has_internet: !!crew.has_internet,
      module_type: crew.module_type || '',
      cabinet_type: crew.cabinet_type || '',
      status: crew.status || 'in_work',
      photo_url: crew.photo_url || '',
    });
    setEditId(crew.id);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: file_url }));
    toast.success('Фото загружено');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Буровые бригады</h2>
        <Dialog open={open} onOpenChange={v => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Редактирование' : 'Новая бригада'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">№ бригады *</Label>
                <Input value={form.crew_number} onChange={e => setForm({ ...form, crew_number: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Тип БУ</Label>
                <Input value={form.drill_type} onChange={e => setForm({ ...form, drill_type: e.target.value })} placeholder="например ZJ-50" />
              </div>
              <div>
                <Label className="text-xs">Месторождение</Label>
                <Input value={form.field_name} onChange={e => setForm({ ...form, field_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Номера комплектов БИ</Label>
                <Input value={form.bi_kits_numbers} onChange={e => setForm({ ...form, bi_kits_numbers: e.target.value })} placeholder="например: БИ-001, БИ-002" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Интернет</Label>
                <Switch checked={form.has_internet} onCheckedChange={v => setForm({ ...form, has_internet: v })} />
              </div>
              <div>
                <Label className="text-xs">Тип модуля</Label>
                <Input value={form.module_type} onChange={e => setForm({ ...form, module_type: e.target.value })} placeholder="например АРБИ-М" />
              </div>
              <div>
                <Label className="text-xs">Тип шкафов</Label>
                <Input value={form.cabinet_type} onChange={e => setForm({ ...form, cabinet_type: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Статус</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(crewStatuses).map(([k, { label }]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Фото БУ</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form.photo_url && <img src={form.photo_url} className="w-16 h-16 rounded-lg object-cover" alt="" />}
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span><Camera className="w-4 h-4 mr-1" /> Загрузить</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editId ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Тип БУ</TableHead>
                <TableHead>Месторождение</TableHead>
                <TableHead>Компл. БИ</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crews.map(crew => (
                <TableRow key={crew.id}>
                  <TableCell className="font-medium">{crew.crew_number}</TableCell>
                  <TableCell>{crew.drill_type || '—'}</TableCell>
                  <TableCell>{crew.field_name || '—'}</TableCell>
                  <TableCell>{crew.bi_kits_numbers || '—'}</TableCell>
                  <TableCell><StatusBadge statusMap={crewStatuses} status={crew.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(crew)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(crew.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}