import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { categoryLabels } from '@/lib/statusConfig';
import { format } from 'date-fns';

const categories = Object.entries(categoryLabels);
const emptyForm = { title: '', category: 'other', description: '', file_url: '', version: '1.0', file_name: '' };

export default function AdminInstructions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const { data: instructions = [] } = useQuery({
    queryKey: ['instructions'],
    queryFn: () => base44.entities.Instruction.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) return base44.entities.Instruction.update(editId, data);
      return base44.entities.Instruction.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructions'] });
      toast.success(editId ? 'Инструкция обновлена' : 'Инструкция добавлена');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Instruction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructions'] });
      toast.success('Инструкция удалена');
    },
  });

  const openEdit = (item) => {
    setForm({
      title: item.title || '',
      category: item.category || 'other',
      description: item.description || '',
      file_url: item.file_url || '',
      version: item.version || '1.0',
      file_name: item.file_name || '',
    });
    setEditId(item.id);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url, file_name: file.name }));
    toast.success('Файл загружен');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Инструкции</h2>
        <Dialog open={open} onOpenChange={v => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); }}>
              <Plus className="w-4 h-4 mr-1" /> Добавить
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? 'Редактирование' : 'Новая инструкция'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Название *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Категория</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Описание</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="h-20" />
              </div>
              <div>
                <Label className="text-xs">Версия</Label>
                <Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Файл</Label>
                <div className="mt-1">
                  {form.file_name && <p className="text-xs text-muted-foreground mb-1">{form.file_name}</p>}
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span><Upload className="w-4 h-4 mr-1" /> Загрузить файл</span>
                    </Button>
                    <input type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" className="hidden" onChange={handleFileUpload} />
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
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Версия</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructions.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{categoryLabels[item.category] || item.category}</Badge>
                  </TableCell>
                  <TableCell>{item.version || '—'}</TableCell>
                  <TableCell className="text-xs">{format(new Date(item.created_date), 'dd.MM.yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
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