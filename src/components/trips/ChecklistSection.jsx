import { useState } from 'react';
import { ChevronDown, ChevronRight, Camera, Loader2, X, CheckCircle2, XCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function RadioGroup({ value, onChange, required }) {
  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={() => onChange('yes')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
          value === 'yes'
            ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-medium'
            : 'border-border text-muted-foreground hover:bg-muted'
        )}
      >
        {value === 'yes' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-4 h-4 rounded-full border-2 border-current inline-block" />}
        Да
      </button>
      <button
        type="button"
        onClick={() => onChange('no')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
          value === 'no'
            ? 'bg-red-50 border-red-400 text-red-700 font-medium'
            : 'border-border text-muted-foreground hover:bg-muted'
        )}
      >
        {value === 'no' ? <XCircle className="w-4 h-4 text-red-500" /> : <span className="w-4 h-4 rounded-full border-2 border-current inline-block" />}
        Нет
      </button>
    </div>
  );
}

function AntennaCount({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          className={cn(
            'w-10 h-10 rounded-lg border text-sm font-semibold transition-all',
            value === String(n)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function SectionBlock({ title, index, sectionKey, data, onChange, onPhotoUpload }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    onPhotoUpload(sectionKey, urls);
    setUploading(false);
    toast.success('Фото загружено');
  };

  const removePhoto = (idx) => {
    const updated = (data.photos || []).filter((_, i) => i !== idx);
    onChange(sectionKey, 'photos', updated);
  };

  // Determine status indicator
  const answers = data.answers || {};
  const hasNo = Object.values(answers).some(v => v === 'no');
  const hasAnswers = Object.values(answers).some(v => v);
  const statusDot = hasNo
    ? 'bg-red-400'
    : hasAnswers
    ? 'bg-emerald-400'
    : 'bg-muted-foreground/30';

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', statusDot)} />
          <span className="font-semibold text-sm">{index}. {title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-card space-y-4 border-t border-border">
          {/* Rendered by parent via children prop */}
          {title === 'АНТЕННЫ' && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Работает антенн:</Label>
              <AntennaCount value={answers.antenna_count} onChange={v => onChange(sectionKey, 'answers', { ...answers, antenna_count: v })} />
            </div>
          )}

          {data.questions?.map(q => (
            <div key={q.key} className="space-y-2">
              <Label className="text-xs text-muted-foreground">{q.label}</Label>
              <RadioGroup
                value={answers[q.key]}
                onChange={v => onChange(sectionKey, 'answers', { ...answers, [q.key]: v })}
              />
              {answers[q.key] === 'no' && (
                <div>
                  <Label className="text-xs text-red-500">Причина (обязательно):</Label>
                  <Textarea
                    value={data.reason || ''}
                    onChange={e => onChange(sectionKey, 'reason', e.target.value)}
                    placeholder="Укажите причину..."
                    rows={2}
                    className="border-red-200 focus:border-red-400"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Photos */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Фото:</Label>
            <div className="flex flex-wrap gap-2">
              {(data.photos || []).map((url, i) => (
                <div key={i} className="relative w-14 h-14">
                  <img src={url} className="w-14 h-14 rounded-lg object-cover" alt="" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              <label className={cn(
                'cursor-pointer w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors',
                (data.photos || []).length > 0 ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted'
              )}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <Camera className={cn('w-4 h-4', (data.photos || []).length > 0 ? 'text-primary' : 'text-muted-foreground')} />
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              </label>
            </div>
          </div>

          {/* Comments */}
          <div>
            <Label className="text-xs text-muted-foreground">Выполненные работы / Комментарии:</Label>
            <Textarea
              value={data.comment || ''}
              onChange={e => onChange(sectionKey, 'comment', e.target.value)}
              placeholder="Опишите выполненные работы..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const checklistSections = [
  {
    key: 'antennas',
    title: 'АНТЕННЫ',
    questions: [
      { key: 'antennas_cleaned', label: 'Очистка антенн выполнена:' },
    ],
  },
  {
    key: 'cabinets',
    title: 'ШКАФЫ',
    questions: [
      { key: 'power_connected', label: 'Подключение к электросети:' },
      { key: 'no_damage', label: 'Повреждения обнаружены:' },
      { key: 'cables_checked', label: 'Проверка кабелей выполнена:' },
    ],
  },
  {
    key: 'cameras',
    title: 'КАМЕРЫ / РАДИОМОСТ / LTE',
    questions: [
      { key: 'cameras_checked', label: 'Проверка и осмотр камер, антенн радиомоста и 4G/LTE роутера:' },
    ],
  },
  {
    key: 'rfid_reader',
    title: 'RFID-СЧИТЫВАТЕЛЬ',
    questions: [
      { key: 'rfid_reader_checked', label: 'Проверка RFID-считывателя:' },
    ],
  },
  {
    key: 'equipment_access',
    title: 'ДОСТУПНОСТЬ ОБОРУДОВАНИЯ',
    questions: [
      { key: 'equipment_accessible', label: 'Проверка доступности оборудования:' },
    ],
  },
  {
    key: 'internet',
    title: 'ДОСТУПНОСТЬ ИНТЕРНЕТА',
    questions: [
      { key: 'internet_available', label: 'Проверка доступности сети Интернет:' },
    ],
  },
  {
    key: 'mpc',
    title: 'МРС (миниПК)',
    questions: [
      { key: 'mpc_services_ok', label: 'Проверка работы служб на МРС:' },
    ],
  },
  {
    key: 'rfid_scanner',
    title: 'RFID-СКАНЕР',
    questions: [
      { key: 'rfid_scanner_ok', label: 'Проверка работы RFID-сканера:' },
    ],
  },
];

export default function ChecklistForm({ value, onChange }) {
  const handleChange = (sectionKey, field, val) => {
    onChange({
      ...value,
      [sectionKey]: {
        ...(value[sectionKey] || {}),
        [field]: val,
      },
    });
  };

  const handlePhotoUpload = (sectionKey, urls) => {
    const existing = value[sectionKey]?.photos || [];
    handleChange(sectionKey, 'photos', [...existing, ...urls]);
  };

  return (
    <div className="space-y-2">
      {checklistSections.map((section, i) => (
        <SectionBlock
          key={section.key}
          index={i + 1}
          title={section.title}
          sectionKey={section.key}
          data={value[section.key] || {}}
          onChange={handleChange}
          onPhotoUpload={handlePhotoUpload}
        />
      ))}
    </div>
  );
}