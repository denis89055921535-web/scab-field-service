import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Camera, Loader2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { format } from 'date-fns';

const emptyForm = { incident_date: '', object_name: '', pipe_kit_number: '', photos: [], comment: '' };

export default function Incidents() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
  });

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
              <DialogTitle>{editId ? 'Редактировать' : 'Новая авария'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Дата аварии *</Label>
                <Input type="date" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Наименование объекта *</Label>
                <Input value={form.object_name} onChange={e => setForm({ ...form, object_name: e.target.value })} placeholder="Укажите объект" />
              </div>
              <div>
                <Label className="text-xs">Номер комплекта трубы</Label>
                <Input value={form.pipe_kit_number} onChange={e => setForm({ ...form, pipe_kit_number: e.target.value })} placeholder="Номер комплекта" />
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
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.incident_date || !form.object_name}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editId ? 'Сохранить' : 'Добавить'}
              </Button>
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
            <Card key={incident.id} className="p-4 space-y-2 cursor-pointer" onClick={() => openEdit(incident)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium text-sm">{incident.object_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {incident.incident_date ? format(new Date(incident.incident_date), 'dd.MM.yyyy') : '—'}
                    {incident.pipe_kit_number ? ` · Труба: ${incident.pipe_kit_number}` : ''}
                  </div>
                  {incident.comment && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{incident.comment}</div>
                  )}
                </div>
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              </div>
              {incident.photos?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {incident.photos.slice(0, 4).map((url, i) => (
                    <img key={i} src={url} className="w-12 h-12 rounded object-cover" alt="" />
                  ))}
                  {incident.photos.length > 4 && (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">+{incident.photos.length - 4}</div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}