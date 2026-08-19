import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Upload, Loader2, FileText, FolderOpen, ChevronLeft, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminInstructions() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState(null);

  // --- категории ---
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catEditId, setCatEditId] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['instruction-categories'],
    queryFn: () => base44.entities.InstructionCategory.list(),
  });

  const { data: instructions = [] } = useQuery({
    queryKey: ['instructions'],
    queryFn: () => base44.entities.Instruction.list(),
  });

  const saveCategory = useMutation({
    mutationFn: (data) => catEditId
      ? base44.entities.InstructionCategory.update(catEditId, data)
      : base44.entities.InstructionCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruction-categories'] });
      toast.success(catEditId ? 'Раздел обновлён' : 'Раздел создан');
      setCatOpen(false);
      setCatName('');
      setCatEditId(null);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id) => base44.entities.InstructionCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruction-categories'] });
      queryClient.invalidateQueries({ queryKey: ['instructions'] });
      toast.success('Раздел удалён');
    },
  });

  // --- файлы ---
  const [fileOpen, setFileOpen] = useState(false);
  const [fileTitle, setFileTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const saveFile = useMutation({
    mutationFn: (data) => base44.entities.Instruction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructions'] });
      toast.success('Файл добавлен');
      setFileOpen(false);
      setFileTitle('');
      setFileUrl('');
      setFileName('');
    },
  });

  const deleteFile = useMutation({
    mutationFn: (id) => base44.entities.Instruction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructions'] });
      toast.success('Файл удалён');
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);
      setFileName(file.name);
      if (!fileTitle) setFileTitle(file.name.replace(/\.pdf$/i, ''));
      toast.success('Файл загружен');
    } catch {
      toast.error('Ошибка загрузки файла');
    }
    setUploading(false);
  };

  const countFor = (catId) => instructions.filter(i => i.category_id === catId).length;
  const currentCategory = categories.find(c => c.id === activeCategory);
  const currentFiles = instructions.filter(i => i.category_id === activeCategory);

  return (
    <div className="p-4 space-y-4">
      {!activeCategory ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Инструкции — разделы</h2>
            <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) { setCatName(''); setCatEditId(null); } }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Раздел</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>{catEditId ? 'Редактировать раздел' : 'Новый раздел'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Название</Label>
                    <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="например: RFID-оборудование" />
                  </div>
                  <Button className="w-full" disabled={!catName || saveCategory.isPending}
                    onClick={() => saveCategory.mutate({ name: catName })}>
                    {saveCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Разделов пока нет</p>
            ) : categories.map(cat => (
              <Card key={cat.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => setActiveCategory(cat.id)}>
                  <p className="font-semibold text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{countFor(cat.id)} файлов</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setCatEditId(cat.id); setCatName(cat.name); setCatOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm('Удалить раздел и все файлы в нём?')) deleteCategory.mutate(cat.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button size="icon" variant="ghost" onClick={() => setActiveCategory(null)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold truncate">{currentCategory?.name}</h2>
            </div>
            <Dialog open={fileOpen} onOpenChange={(v) => { setFileOpen(v); if (!v) { setFileTitle(''); setFileUrl(''); setFileName(''); } }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Файл</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Загрузить PDF</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Название</Label>
                    <Input value={fileTitle} onChange={e => setFileTitle(e.target.value)} placeholder="Название инструкции" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">PDF файл</Label>
                    {fileUrl ? (
                      <div className="flex items-center gap-2 p-2 border rounded-lg min-w-0">
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-sm truncate flex-1 min-w-0">{fileName}</span>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-sm">{uploading ? 'Загрузка...' : 'Выбрать PDF'}</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
                      </label>
                    )}
                  </div>
                  <Button className="w-full" disabled={!fileTitle || !fileUrl || saveFile.isPending}
                    onClick={() => saveFile.mutate({ title: fileTitle, file_url: fileUrl, file_name: fileName, category_id: activeCategory })}>
                    {saveFile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {currentFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Файлов пока нет</p>
            ) : currentFiles.map(file => (
              <Card key={file.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <a href={file.file_url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{file.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{file.file_name}</p>
                </a>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm('Удалить файл?')) deleteFile.mutate(file.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
