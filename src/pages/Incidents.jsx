import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MobileSelect from '@/components/common/MobileSelect';
import { Plus, Camera, Loader2, AlertTriangle, X, Save, Mail, FileDown, Send } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
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

export default function Incidents() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');

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
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['incidents'] });
      const previous = queryClient.getQueryData(['incidents']);
      queryClient.setQueryData(['incidents'], (old = []) =>
        editId
          ? old.map(i => i.id === editId ? { ...i, ...data } : i)
          : [{ ...data, id: '__optimistic__', created_date: new Date().toISOString() }, ...old]
      );
      return { previous };
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['incidents'], ctx.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(editId ? 'Авария обновлена' : 'Авария добавлена');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Incident.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['incidents'] });
      const previous = queryClient.getQueryData(['incidents']);
      queryClient.setQueryData(['incidents'], (old = []) => old.filter(i => i.id !== id));
      return { previous };
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['incidents'], ctx.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Запись удалена');
    },
  });

  // Existing saved incidents are read-only
  const isReadOnly = !!editId;

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

  const handleSend = () => {
    const saved = localStorage.getItem('incident_report_email');
    setEmailInput(saved || '');
    setEmailDialogOpen(true);
  };

  const handleSendConfirm = async () => {
    if (!emailInput) { toast.error('Введите email'); return; }
    localStorage.setItem('incident_report_email', emailInput);
    setEmailDialogOpen(false);
    setSending(true);
    try {
      await sendIncidentByEmail(form, emailInput);
      toast.success('Отчёт отправлен на ' + emailInput);
    } catch {
      toast.error('Ошибка отправки');
    }
    setSending(false);
  };

  const handleExcel = () => exportIncidentToExcel(form);

  return (
    <div className="pb-24">
      <PageHeader title="Аварии" />

      <div className="px-4 pt-4 space-y-3">
        <Dialog open={open} onOpenChange={v => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="w-full" onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-2" /> Добавить аварию
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isReadOnly ? 'Просмотр аварии' : 'Новая авария'}</DialogTitle>
            </DialogHeader>

            {isReadOnly && (
              <div className="px-0 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400 text-center">
                Запись сохранена и не может быть изменена
              </div>
            )}

            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Дата аварии *</Label>
                <Input type="date" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} disabled={isReadOnly} readOnly={isReadOnly} />
              </div>

              <div>
                <Label className="text-xs">Объект *</Label>
                {objectNames.length > 0 ? (
                  <MobileSelect
                    value={form.object_name}
                    onValueChange={v => setForm({ ...form, object_name: v })}
                    placeholder="Выберите объект"
                    options={objectNames.map(name => ({ value: name, label: name }))}
                    disabled={isReadOnly}
                  />
                ) : (
                  <Input value={form.object_name} onChange={e => setForm({ ...form, object_name: e.target.value })} placeholder="Укажите объект" disabled={isReadOnly} readOnly={isReadOnly} />
                )}
              </div>

              <div>
                <Label className="text-xs">Комплект БИ</Label>
                {biKits.length > 0 ? (
                  <MobileSelect
                    value={form.bi_kit_number}
                    onValueChange={v => setForm({ ...form, bi_kit_number: v })}
                    placeholder="Выберите комплект БИ"
                    options={biKits.map(kit => ({ value: kit, label: kit }))}
                    disabled={isReadOnly}
                  />
                ) : (
                  <Input value={form.bi_kit_number} onChange={e => setForm({ ...form, bi_kit_number: e.target.value })} placeholder="Номер комплекта БИ" disabled={isReadOnly} readOnly={isReadOnly} />
                )}
              </div>

              <div>
                <Label className="text-xs">Номер трубы</Label>
                <Input value={form.pipe_number} onChange={e => setForm({ ...form, pipe_number: e.target.value })} placeholder="Введите номер трубы" disabled={isReadOnly} readOnly={isReadOnly} />
              </div>

              <div>
                <Label className="text-xs">Номер RFID-метки</Label>
                <Input value={form.rfid_tag_number} onChange={e => setForm({ ...form, rfid_tag_number: e.target.value })} placeholder="Введите номер RFID-метки" disabled={isReadOnly} readOnly={isReadOnly} />
              </div>

              <div>
                <Label className="text-xs">Дата последней инспекции</Label>
                <Input type="date" value={form.last_inspection_date} onChange={e => setForm({ ...form, last_inspection_date: e.target.value })} disabled={isReadOnly} readOnly={isReadOnly} />
              </div>

              <div>
                <Label className="text-xs">Фотографии</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {form.photos.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16">
                      <img src={url} className="w-16 h-16 rounded-lg object-cover" alt="" />
                      {!isReadOnly && (
                        <button onClick={() => removePhoto(idx)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!isReadOnly && (
                    <label className="cursor-pointer w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs">Комментарий</Label>
                <Textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="Опишите ситуацию..." rows={3} disabled={isReadOnly} readOnly={isReadOnly} />
              </div>

              <div className="flex gap-2 pt-1">
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    className="h-11 px-3"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !form.incident_date || !form.object_name}
                    title="Сохранить"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                )}
                <Button
                  className="flex-1 h-11"
                  onClick={handleSend}
                  disabled={sending}
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
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Загрузка...</div>
        ) : incidents.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Аварий не зарегистрировано</p>
          </div>
        ) : (
          incidents.map(incident => (
            <Card key={incident.id} className="px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openEdit(incident)}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{incident.object_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {incident.incident_date ? format(new Date(incident.incident_date), 'dd.MM.yyyy') : '—'}
                    {incident.bi_kit_number ? ` · БИ: ${incident.bi_kit_number}` : ''}
                    {incident.pipe_number ? ` · Труба: ${incident.pipe_number}` : ''}
                    {incident.rfid_tag_number ? ` · RFID: ${incident.rfid_tag_number}` : ''}
                  </div>
                  {incident.comment && (
                    <div className="text-xs text-muted-foreground truncate">{incident.comment}</div>
                  )}
                </div>
                {incident.photos?.length > 0 && (
                  <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5">
                    <Camera className="w-3 h-3" />{incident.photos.length}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Email dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Отправить отчёт по email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Email получателя</Label>
              <Input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="example@mail.com"
                onKeyDown={e => e.key === 'Enter' && handleSendConfirm()}
              />
            </div>
            <Button className="w-full" onClick={handleSendConfirm} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Отправить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}