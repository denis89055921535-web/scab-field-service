import { useState } from 'react';
import { FileText, Plus, X, Download, Loader2, Calendar } from 'lucide-react';
import { attachFile, isLocalFile, getFileId } from '@/lib/fileService';
import { fileGet } from '@/lib/offlineDb';
import { resolvePhotoUrl } from '@/api/base44Client';
import { toast } from 'sonner';

function formatDate(d) {
  if (!d) return '';
  const p = String(d).split('T')[0];
  const [y, m, day] = p.split('-');
  return (y && m && day) ? `${day}.${m}.${y}` : String(d);
}

export default function AssetDocuments({ title, documents = [], onChange, withDate = false, readOnly = false }) {
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const result = await attachFile();
      const doc = { url: result.url, name: result.name, date: new Date().toISOString().split('T')[0] };
      onChange([...(documents || []), doc]);
      toast.success(result.local ? 'Файл сохранён на устройстве' : 'Файл загружен');
    } catch (err) {
      if (err?.message && !err.message.includes('не выбран')) toast.error('Ошибка: ' + err.message);
    }
    setLoading(false);
  };

  const handleRemove = (idx) => {
    onChange(documents.filter((_, i) => i !== idx));
  };

  const handleDate = (idx, value) => {
    onChange(documents.map((d, i) => i === idx ? { ...d, date: value } : d));
  };

  const handleOpen = async (doc) => {
    if (isLocalFile(doc.url)) {
      const rec = await fileGet(getFileId(doc.url));
      if (rec?.blob) {
        const u = URL.createObjectURL(rec.blob);
        window.open(u, '_blank');
        setTimeout(() => URL.revokeObjectURL(u), 10000);
      }
    } else {
      window.open(resolvePhotoUrl(doc.url), '_blank');
    }
  };

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {!readOnly && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading}
            className="flex items-center gap-1 text-sm text-primary hover:opacity-80"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Добавить
          </button>
        )}
      </div>
      {(!documents || documents.length === 0) ? (
        <p className="text-xs text-muted-foreground">Документов пока нет</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" title={doc.name}>{doc.name || 'Документ'}</div>
                {withDate && (
                  readOnly ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(doc.date)}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={doc.date || ''}
                      onChange={e => handleDate(idx, e.target.value)}
                      className="text-xs bg-transparent border border-border rounded px-1 mt-0.5 text-muted-foreground"
                    />
                  )
                )}
              </div>
              <button type="button" onClick={() => handleOpen(doc)} className="text-muted-foreground hover:text-primary shrink-0">
                <Download className="w-4 h-4" />
              </button>
              {!readOnly && (
                <button type="button" onClick={() => handleRemove(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}