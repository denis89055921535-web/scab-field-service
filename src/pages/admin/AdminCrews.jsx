import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/common/StatusBadge';
import { crewStatuses } from '@/lib/statusConfig';


const PARTNERS = ['ИНК-Сервис', 'ИНК-ТКРС', 'Газпром Бурение', 'МУБР'];

const emptyForm = {
  crew_number: '', drill_type: '', field_name: '', project_name: '', bi_kits_numbers: '', 
  has_internet: false, module_type: '', cabinet_type: '', status: 'in_work', photo_url: '', partner: ''
};

export default function AdminCrews() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [kits, setKits] = useState(['', '']);
  const [currentUser, setCurrentUser] = useState(null);
  const [partnerFilter, setPartnerFilter] = useState('');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);


  const { data: crews = [], isLoading } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list('-created_date'),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const biKits = assets.filter(a => a.asset_type === 'bi_kit').map(a => a.name);
  const modules = assets.filter(a => a.asset_type === 'reader_module').map(a => a.name);
  const cabinets = assets.filter(a => a.asset_type === 'cabinet').map(a => a.name);

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
      project_name: crew.project_name || '',
      bi_kits_numbers: crew.bi_kits_numbers || '',
      has_internet: !!crew.has_internet,
      module_type: crew.module_type || '',
      cabinet_type: crew.cabinet_type || '',
      status: crew.status || 'in_work',
      photo_url: crew.photo_url || '',
      partner: crew.partner || '',
    });
    const parsed = crew.bi_kits_numbers
      ? crew.bi_kits_numbers.split('\n').map(s => s.trim()).filter(s => s !== '')
      : ['', ''];
    setKits(parsed.length >= 2 ? parsed : [...parsed, ...Array(2 - parsed.length).fill('')]);
    setEditId(crew.id);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    setKits(['', '']);
  };

  const updateKits = (newKits) => {
    setKits(newKits);
    setForm(f => ({ ...f, bi_kits_numbers: newKits.filter(Boolean).join('\n') }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: file_url }));
    toast.success('Фото загружено');
  };

  const filteredCrews = partnerFilter ? crews.filter(c => c.partner === partnerFilter) : crews;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold">Буровые бригады</h2>
        <div className="flex items-center gap-2">
          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Все партнёры" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Все партнёры</SelectItem>
              {PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
                <Label className="text-xs">Наименование проекта</Label>
                <Input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="Название проекта" />
              </div>
              <div>
                <Label className="text-xs">Партнёр</Label>
                {currentUser?.role === 'admin' ? (
                  <Select value={form.partner} onValueChange={v => setForm({ ...form, partner: v })}>
                    <SelectTrigger><SelectValue placeholder="Выберите партнёра" /></SelectTrigger>
                    <SelectContent>
                      {PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.partner || '—'} disabled className="bg-muted" />
                )}
              </div>
              <div>
                <Label className="text-xs">Номера комплектов БИ</Label>
                <div className="space-y-2 mt-1">
                  {kits.map((kit, idx) => (
                    <div key={idx} className="flex gap-2">
                      {biKits.length > 0 ? (
                        <Select value={kit} onValueChange={v => { const updated = [...kits]; updated[idx] = v; updateKits(updated); }}>
                          <SelectTrigger><SelectValue placeholder={`Комплект ${idx + 1}`} /></SelectTrigger>
                          <SelectContent>
                            {biKits.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Textarea
                          value={kit}
                          rows={2}
                          onChange={e => { const updated = [...kits]; updated[idx] = e.target.value; updateKits(updated); }}
                          placeholder={`Комплект ${idx + 1}`}
                          className="resize-none"
                        />
                      )}
                      {kits.length > 2 && (
                        <Button type="button" size="icon" variant="outline" onClick={() => updateKits(kits.filter((_, i) => i !== idx))}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => updateKits([...kits, ''])}>
                    <Plus className="w-4 h-4 mr-1" /> Добавить комплект
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Интернет</Label>
                <Switch checked={form.has_internet} onCheckedChange={v => setForm({ ...form, has_internet: v })} />
              </div>
              <div>
                <Label className="text-xs">Тип модуля</Label>
                {modules.length > 0 ? (
                  <Select value={form.module_type} onValueChange={v => setForm({ ...form, module_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Выберите модуль" /></SelectTrigger>
                    <SelectContent>
                      {modules.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.module_type} onChange={e => setForm({ ...form, module_type: e.target.value })} placeholder="например АРБИ-М" />
                )}
              </div>
              <div>
                <Label className="text-xs">Тип шкафов</Label>
                {cabinets.length > 0 ? (
                  <Select value={form.cabinet_type} onValueChange={v => setForm({ ...form, cabinet_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Выберите шкаф" /></SelectTrigger>
                    <SelectContent>
                      {cabinets.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.cabinet_type} onChange={e => setForm({ ...form, cabinet_type: e.target.value })} />
                )}
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
                <TableHead>Партнёр</TableHead>
                <TableHead>Компл. БИ</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCrews.map(crew => (
                <TableRow key={crew.id}>
                  <TableCell className="font-medium">{crew.crew_number}</TableCell>
                  <TableCell>{crew.drill_type || '—'}</TableCell>
                  <TableCell>{crew.field_name || '—'}</TableCell>
                  <TableCell>{crew.partner || '—'}</TableCell>
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