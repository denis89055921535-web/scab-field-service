import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const emptyForm = { incident_date: '', object_name: '', pipe_kit_number: '', photos: [], comment: '' };

export default function AdminIncidents() {
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
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Объект</TableHead>
                <TableHead>№ комплекта трубы</TableHead>
                <TableHead>Фото</TableHead>
                <TableHead>Комментарий</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map(incident => (
                <TableRow key={incident.id}>
                  <TableCell className="whitespace-nowrap">{incident.incident_date ? format(new Date(incident.incident_date), 'dd.MM.yyyy') : '—'}</TableCell>
                  <TableCell className="font-medium">{incident.object_name}</TableCell>
                  <TableCell>{incident.pipe_kit_number || '—'}</TableCell>
                  <TableCell>{incident.photos?.length ? `${incident.photos.length} фото` : '—'}</TableCell>
                  <TableCell className="max-w-xs truncate">{incident.comment || '—'}</TableCell>
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