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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import StatusBadge from '@/components/common/StatusBadge';
import { crewStatuses } from '@/lib/statusConfig';


const PARTNERS = ['ИНК-Сервис', 'ИНК-ТКРС', 'Газпром Бурение', 'МУБР'];

const emptyForm = {
  crew_number: '', drill_type: '', field_name: '', bi_kits_numbers: '', 
  has_internet: false, has_wifi: false, has_lte: false, has_satellite: false, has_no_internet: false,
  module_type: '', cabinet_type: '', status: 'in_work', photo_url: '', partner: ''
};

const parseList = (str, minCount = 1) => {
  const parsed = str ? str.split('\n').map(s => s.trim()).filter(Boolean) : [];
  return parsed.length >= minCount ? parsed : [...parsed, ...Array(minCount - parsed.length).fill('')];
};

export default function AdminCrews() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [kits, setKits] = useState(['', '']);
  const [modulesList, setModulesList] = useState(['']);
  const [cabinetsList, setCabinetsList] = useState(['']);
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

  // Собираем все активы, уже занятые в ДРУГИХ бригадах (не в текущей редактируемой)
  const otherCrews = crews.filter(c => c.id !== editId);
  const usedBiKits = new Set(otherCrews.flatMap(c => c.bi_kits_numbers ? c.bi_kits_numbers.split('\n').map(s => s.trim()).filter(Boolean) : []));
  const usedModules = new Set(otherCrews.flatMap(c => c.module_type ? c.module_type.split('\n').map(s => s.trim()).filter(Boolean) : []));
  const usedCabinets = new Set(otherCrews.flatMap(c => c.cabinet_type ? c.cabinet_type.split('\n').map(s => s.trim()).filter(Boolean) : []));

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
      has_wifi: !!crew.has_wifi,
      has_lte: !!crew.has_lte,
      has_satellite: !!crew.has_satellite,
      has_no_internet: !!crew.has_no_internet,
      module_type: crew.module_type || '',
      cabinet_type: crew.cabinet_type || '',
      status: crew.status || 'in_work',
      photo_url: crew.photo_url || '',
      partner: crew.partner || '',
    });
    setKits(parseList(crew.bi_kits_numbers, 2));
    setModulesList(parseList(crew.module_type, 1));
    setCabinetsList(parseList(crew.cabinet_type, 1));
    setEditId(crew.id);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    setKits(['', '']);
    setModulesList(['']);
    setCabinetsList(['']);
  };

  const updateKits = (newKits) => {
    setKits(newKits);
    setForm(f => ({ ...f, bi_kits_numbers: newKits.filter(Boolean).join('\n') }));
  };

  const updateModules = (newList) => {
    setModulesList(newList);
    setForm(f => ({ ...f, module_type: newList.filter(Boolean).join('\n') }));
  };

  const updateCabinets = (newList) => {
    setCabinetsList(newList);
    setForm(f => ({ ...f, cabinet_type: newList.filter(Boolean).join('\n') }));
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
            <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); setModulesList(['']); setCabinetsList(['']); setKits(['', '']); }}>
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
                            {assets.filter(a => a.asset_type === 'bi_kit' && (!usedBiKits.has(a.name) || kits[idx] === a.name)).map(a => (
                              <SelectItem key={a.name} value={a.name}>
                                <span>{a.name}</span>
                                {a.notes && <span className="ml-2 text-xs text-muted-foreground">— {a.notes}</span>}
                              </SelectItem>
                            ))}
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
              <div>
                <Label className="text-xs">Интернет</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[{ key: 'has_wifi', label: 'Wi-Fi' }, { key: 'has_lte', label: 'LTE' }, { key: 'has_satellite', label: 'Спутник' }].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, [key]: !f[key], has_no_internet: false }))}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                        form[key]
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-transparent text-muted-foreground border-input hover:border-primary'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, has_no_internet: !f.has_no_internet, has_wifi: false, has_lte: false, has_satellite: false }))}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      form.has_no_internet
                        ? 'bg-destructive text-destructive-foreground border-destructive'
                        : 'bg-transparent text-muted-foreground border-input hover:border-destructive'
                    )}
                  >
                    Нет интернета
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Тип модуля</Label>
                <div className="space-y-2 mt-1">
                  {modulesList.map((mod, idx) => (
                    <div key={idx} className="flex gap-2">
                      {modules.length > 0 ? (
                        <Select value={mod} onValueChange={v => { const u = [...modulesList]; u[idx] = v; updateModules(u); }}>
                          <SelectTrigger><SelectValue placeholder={`Модуль ${idx + 1}`} /></SelectTrigger>
                          <SelectContent>
                            {assets.filter(a => a.asset_type === 'reader_module' && (!usedModules.has(a.name) || modulesList[idx] === a.name)).map(a => (
                              <SelectItem key={a.name} value={a.name}>
                                <span>{a.name}</span>
                                {a.notes && <span className="ml-2 text-xs text-muted-foreground">— {a.notes}</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={mod}
                          onChange={e => { const u = [...modulesList]; u[idx] = e.target.value; updateModules(u); }}
                          placeholder={`например АРБИ-М`}
                        />
                      )}
                      {modulesList.length > 1 && (
                        <Button type="button" size="icon" variant="outline" onClick={() => updateModules(modulesList.filter((_, i) => i !== idx))}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => updateModules([...modulesList, ''])}>
                    <Plus className="w-4 h-4 mr-1" /> Добавить модуль
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Тип шкафов</Label>
                <div className="space-y-2 mt-1">
                  {cabinetsList.map((cab, idx) => (
                    <div key={idx} className="flex gap-2">
                      {cabinets.length > 0 ? (
                        <Select value={cab} onValueChange={v => { const u = [...cabinetsList]; u[idx] = v; updateCabinets(u); }}>
                          <SelectTrigger><SelectValue placeholder={`Шкаф ${idx + 1}`} /></SelectTrigger>
                          <SelectContent>
                            {assets.filter(a => a.asset_type === 'cabinet' && (!usedCabinets.has(a.name) || cabinetsList[idx] === a.name)).map(a => (
                              <SelectItem key={a.name} value={a.name}>
                                <span>{a.name}</span>
                                {a.notes && <span className="ml-2 text-xs text-muted-foreground">— {a.notes}</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={cab}
                          onChange={e => { const u = [...cabinetsList]; u[idx] = e.target.value; updateCabinets(u); }}
                          placeholder={`Шкаф ${idx + 1}`}
                        />
                      )}
                      {cabinetsList.length > 1 && (
                        <Button type="button" size="icon" variant="outline" onClick={() => updateCabinets(cabinetsList.filter((_, i) => i !== idx))}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => updateCabinets([...cabinetsList, ''])}>
                    <Plus className="w-4 h-4 mr-1" /> Добавить шкаф
                  </Button>
                </div>
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