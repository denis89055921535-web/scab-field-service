import { useState } from 'react';
import { openDocument } from '@/lib/openDocument';
import { Paperclip, FileText, X, Download, Loader2 } from 'lucide-react';
import { attachFile, isLocalFile, getFileId } from '@/lib/fileService';
import { fileGet } from '@/lib/offlineDb';
import { resolvePhotoUrl } from '@/api/base44Client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function FileAttach({ attachment, onAttach, onRemove, readOnly, label = 'Прикрепить файл' }) {
  const [loading, setLoading] = useState(false);

  const handleAttach = async () => {
    setLoading(true);
    try {
      const result = await attachFile();
      onAttach({ url: result.url, name: result.name });
      toast.success(result.local ? 'Файл сохранён на устройстве' : 'Файл загружен');
    } catch (err) {
      if (err?.message && !err.message.includes('не выбран')) {
        toast.error('Ошибка файла: ' + err.message);
      }
    }
    setLoading(false);
  };

  const handleOpen = () => {
    openDocument(attachment.url);
  };

  if (attachment?.url) {
    return (
      <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/30">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm truncate flex-1" title={attachment.name}>{attachment.name || 'Файл'}</span>
        <button type="button" onClick={handleOpen} className="text-muted-foreground hover:text-primary shrink-0">
          <Download className="w-4 h-4" />
        </button>
        {!readOnly && (
          <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (readOnly) {
    return <span className="text-xs text-muted-foreground">Файл не прикреплён</span>;
  }

  return (
    <button
      type="button"
      onClick={handleAttach}
      disabled={loading}
      className={cn('flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors')}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
      {label}
    </button>
  );
}