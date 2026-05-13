import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Camera, Loader2, X, Save, Mail, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportIncidentToExcel, sendIncidentByEmail } from '@/lib/incidentExport';

const emptyForm = {
  incident_date: '',
  object_name: '',
  bi_kit_number: '',
  pipe_number: '',
  rfid_tag_number: '',
  last_inspection_date: '',
  pipe_kit_number: '',
  photos: [],
  comment: '',
};

export default function AdminIncidents() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reportEmail, setReportEmail] = useState(() => localStorage.getItem('incident_report_email') || '');
  const [emailEditing, setEmailEditing] = useState(false);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list(),
  });

  const biKits = assets.filter(a => a.asset_type === 'bi_kit').map(a => a.name);
  const objectNames = crews.map(c => `Бригада №${c.crew_number}${c.field_name ? ` — ${c.field_name}` : ''}`);

  const saveMutation = useMutation({
    mutationFn: (data) => editId
      ? base44.entities.Incident.update(editId, data)
      : base44.entities.Incident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(editId ? 'Авария обновлена' : 'Авария добавлена');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Incident.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Запись удалена');
    },
  });

  const openEdit = (incident) => {
    setForm({
      incident_date: incident.incident_date || '',
      object_name: incident.object_name || '',
      bi_kit_number: incident.bi_kit_number || '',
      pipe_number: incident.pipe_number || '',
      rfid_tag_number: incident.rfid_tag_number || '',
      last_inspection_date: incident.last_inspection_date || '',
      pipe_kit_number: incident.pipe_kit_number || '',
      photos: incident.photos || [],
      comment: incident.comment || '',
    });
    setEditId(incident.id);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file }).then(r => r.file_url)));
    setForm(f => ({ ...f, photos: [...f.photos, ...urls] }));
    setUploading(false);
    toast.success('Фото загружено');
  };

  const removePhoto = (idx) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => saveMutation.mutate(form);

  const handleSend = async () => {
    if (!reportEmail) { toast.error('Укажите email для отправки'); return; }
    setSending(true);
    try {
      await sendIncidentByEmail(form, reportEmail);
      toast.success('Отчёт отправлен на ' + reportEmail);
    } catch {
      toast.error('Ошибка отправки');
    }
    setSending(false);
  };

  const handleExcel = () => exportIncidentToExcel(form);

  const IncidentForm = () => (
    <div className="space-y-3 mt-2">
      <div>
        <Label className="text-xs">Дата аварии *</Label>
        <Input type="date" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} />
      </div>

      <div>
        <Label className="text-xs">Объект *</Label>
        {objectNames.length > 0 ? (
          <Select value={form.object_name} onValueChange={v => setForm({ ...form, object_name: v })}>
            <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
            <SelectContent>
              {objectNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input value={form.object_name} onChange={e => setForm({ ...form, object_name: e.target.value })} placeholder="Укажите объект" />
        )}
      </div>

      <div>
        <Label className="text-xs">Комплект БИ</Label>
        {biKits.length > 0 ? (
          <Select value={form.bi_kit_number} onValueChange={v => setForm({ ...form, bi_kit_number: v })}>
            <SelectTrigger><SelectValue placeholder="Выберите комплект БИ" /></SelectTrigger>
            <SelectContent>
              {biKits.map(kit => <SelectItem key={kit} value={kit}>{kit}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input value={form.bi_kit_number} onChange={e => setForm({ ...form, bi_kit_number: e.target.value })} placeholder="Номер комплекта БИ" />
        )}
      </div>

      <div>
        <Label className="text-xs">Номер трубы</Label>
        <Input value={form.pipe_number} onChange={e => setForm({ ...form, pipe_number: e.target.value })} placeholder="Введите номер трубы" />
      </div>

      <div>
        <Label className="text-xs">Номер RFID-метки</Label>
        <Input value={form.rfid_tag_number} onChange={e => setForm({ ...form, rfid_tag_number: e.target.value })} placeholder="Введите номер RFID-метки" />
      </div>

      <div>
        <Label className="text-xs">Дата последней инспекции</Label>
        <Input type="date" value={form.last_inspection_date} onChange={e => setForm({ ...form, last_inspection_date: e.target.value })} />
      </div>

      <div>
        <Label className="text-xs">Фотографии</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {form.photos.map((url, idx) => (
            <div key={idx} className="relative w-16 h-16">
              <img src={url} className="w-16 h-16 rounded-lg object-cover" alt="" />
              <button onClick={() => removePhoto(idx)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <label className="cursor-pointer w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>
      </div>

      <div>
        <Label className="text-xs">Комментарий</Label>
        <Textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="Опишите ситуацию..." rows={3} />
      </div>
      {/* 3 кнопки */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          className="h-11 px-3"
          onClick={handleSave}
          disabled={saveMutation.isPending || !form.incident_date || !form.object_name}
          title="Сохранить"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </Button>
        <Button
          className="flex-1 h-11"
          onClick={handleSend}
          disabled={sending || !form.incident_date || !form.object_name}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Отправить отчёт
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11"
          onClick={handleExcel}
          title="Скачать Excel"
        >
          <FileDown className="w-4 h-4" />
          Excel
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Аварии</h2>
        <Dialog open={open} onOpenChange={v => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Редактировать аварию' : 'Новая авария'}</DialogTitle>
            </DialogHeader>
            <IncidentForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Настройка email для отправки */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Email для отчётов:</span>
        {emailEditing ? (
          <>
            <Input
              className="h-8 text-sm"
              value={reportEmail}
              onChange={e => setReportEmail(e.target.value)}
              placeholder="example@mail.com"
              type="email"
            />
            <Button size="sm" className="h-8" onClick={() => { localStorage.setItem('incident_report_email', reportEmail); setEmailEditing(false); toast.success('Email сохранён'); }}>
              Сохранить
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium">{reportEmail || <span className="text-muted-foreground">не указан</span>}</span>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setEmailEditing(true)}>Изменить</Button>
          </>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Объект</TableHead>
                <TableHead>Комплект БИ</TableHead>
                <TableHead>№ трубы</TableHead>
                <TableHead>RFID-метка</TableHead>
                <TableHead>Посл. инспекция</TableHead>
                <TableHead>Фото</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map(incident => (
                <TableRow key={incident.id}>
                  <TableCell className="whitespace-nowrap">{incident.incident_date ? format(new Date(incident.incident_date), 'dd.MM.yyyy') : '—'}</TableCell>
                  <TableCell className="font-medium">{incident.object_name}</TableCell>
                  <TableCell>{incident.bi_kit_number || '—'}</TableCell>
                  <TableCell>{incident.pipe_number || '—'}</TableCell>
                  <TableCell>{incident.rfid_tag_number || '—'}</TableCell>
                  <TableCell>{incident.last_inspection_date ? format(new Date(incident.last_inspection_date), 'dd.MM.yyyy') : '—'}</TableCell>
                  <TableCell>{incident.photos?.length ? `${incident.photos.length} фото` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(incident)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(incident.id)}>
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