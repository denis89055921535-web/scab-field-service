import { useState } from 'react';
import { ChevronDown, ChevronRight, Camera, Loader2, X, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const CHECKLIST_SECTIONS = [
  {
    key: 'antennas',
    title: 'Антенны',
    fields: [
      { key: 'count', label: 'Работает антенн', type: 'count', options: ['1','2','3','4'] },
      { key: 'cleaning', label: 'Проведена очистка антенн', type: 'yesno' },
      { key: 'structure', label: 'Контроль состояния конструкции', type: 'yesno' },
    ],
  },
  {
    key: 'cabinets',
    title: 'Шкафы',
    fields: [
      { key: 'power', label: 'Подключение к электросети', type: 'yesno' },
      { key: 'damage', label: 'Отсутствие повреждений', type: 'yesno' },
      { key: 'comm_lines', label: 'Проверка коммуникационных линий', type: 'yesno' },
      { key: 'external', label: 'Проверка внешних подключений', type: 'yesno' },
      { key: 'indicators', label: 'Проверка индикации на каждом компоненте', type: 'yesno' },
    ],
  },
  {
    key: 'cables',
    title: 'Проверка кабелей',
    fields: [
      { key: 'visual', label: 'Визуальный осмотр', type: 'yesno' },
      { key: 'corrugated', label: 'Проверка гофрированного кожуха', type: 'yesno' },
      { key: 'connections', label: 'Проверка соединений', type: 'yesno' },
      { key: 'connectors', label: 'Проверка разъемов', type: 'yesno' },
      { key: 'fasteners', label: 'Проверка крепежей', type: 'yesno' },
      { key: 'insulation', label: 'Проверка изоляции кабеля', type: 'yesno' },
      { key: 'cleaning', label: 'Очистка кабеля', type: 'yesno' },
    ],
  },
  {
    key: 'cameras',
    title: 'Камеры, радиомост и 4G/LTE роутер',
    fields: [
      { key: 'check', label: 'Проверка и осмотр камер, антенн радиомоста и 4G/LTE роутера с антенной', type: 'yesno' },
    ],
  },
  {
    key: 'rfid',
    title: 'RFID-считыватель / сканер',
    fields: [
      { key: 'indicators', label: 'Проверить индикаторы', type: 'yesno' },
      { key: 'connections', label: 'Проверить соединения', type: 'yesno' },
    ],
  },
  {
    key: 'antenna_feeder',
    title: 'Антенно-фидерный тракт',
    fields: [
      { key: 'check', label: 'Проверка антенно-фидерного тракта', type: 'yesno' },
    ],
  },
  {
    key: 'equipment',
    title: 'Проверка оборудования',
    fields: [
      { key: 'availability', label: 'Проверка доступности оборудования', type: 'yesno', hasPhotoComment: true },
      { key: 'internet', label: 'Проверка доступности сети Интернет', type: 'yesno', hasPhotoComment: true },
      { key: 'mpc', label: 'Проверка работы служб на МРС / миниПК', type: 'yesno', hasPhotoComment: true },
      { key: 'rfid_reader', label: 'Проверка работы RFID-считывателя / RFID-сканера', type: 'yesno', hasPhotoComment: true },
      { key: 'tsd', label: 'Проверка ТСД', type: 'yesno', hasPhotoComment: true },
    ],
  },
];

function getSectionStatus(section, sectionData) {
  const answers = sectionData?.answers || {};
  const allFilled = section.fields.every(f => answers[f.key] !== undefined && answers[f.key] !== '');
  if (!allFilled) return 'incomplete';
  const hasNo = section.fields.some(f => {
    if (f.type !== 'yesno') return false;
    if (answers[f.key] !== 'no') return false;
    const noNeedsComment = !sectionData?.comments?.[f.key];
    const noNeedsPhoto = !(sectionData?.photos?.[f.key]?.length > 0);
    return noNeedsComment || noNeedsPhoto;
  });
  if (hasNo) return 'error';
  return 'complete';
}

function YesNoField({ value, onChange, hasError }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('yes')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
          value === 'yes'
            ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
            : 'border-border text-muted-foreground hover:bg-muted',
          hasError && !value && 'border-red-300 bg-red-50'
        )}
      >
        <CheckCircle2 className={cn('w-3.5 h-3.5', value === 'yes' ? 'text-emerald-500' : 'text-muted-foreground')} />
        Да
      </button>
      <button
        type="button"
        onClick={() => onChange('no')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
          value === 'no'
            ? 'bg-red-50 border-red-400 text-red-700'
            : 'border-border text-muted-foreground hover:bg-muted',
          hasError && !value && 'border-red-300 bg-red-50'
        )}
      >
        <XCircle className={cn('w-3.5 h-3.5', value === 'no' ? 'text-red-500' : 'text-muted-foreground')} />
        Нет
      </button>
    </div>
  );
}

function CountField({ value, onChange, options, hasError }) {
  return (
    <div className="flex gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'w-10 h-10 rounded-lg border text-sm font-bold transition-all',
            value === opt
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted',
            hasError && !value && 'border-red-300 bg-red-50'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function PhotoUpload({ photos = [], onAdd, onRemove }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    onAdd(urls);
    setUploading(false);
    toast.success('Фото загружено');
  };

  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((url, i) => (
        <div key={i} className="relative w-14 h-14">
          <img src={url} className="w-14 h-14 rounded-lg object-cover" alt="" />
          <button type="button" onClick={() => onRemove(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
      <label className={cn(
        'cursor-pointer w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors',
        photos.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted'
      )}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <Camera className={cn('w-4 h-4', photos.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
        )}
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </label>
    </div>
  );
}

function SectionBlock({ section, sectionData = {}, onChange, showErrors }) {
  const [open, setOpen] = useState(false);

  const answers = sectionData.answers || {};
  const comments = sectionData.comments || {};
  const sectionPhotos = sectionData.photos || {};

  const status = getSectionStatus(section, sectionData);
  const statusColor = status === 'complete' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : 'bg-muted-foreground/30';

  const setAnswer = (fieldKey, val) => {
    onChange({ ...sectionData, answers: { ...answers, [fieldKey]: val } });
  };
  const setComment = (fieldKey, val) => {
    onChange({ ...sectionData, comments: { ...comments, [fieldKey]: val } });
  };
  const addPhotos = (fieldKey, urls) => {
    const existing = sectionPhotos[fieldKey] || [];
    onChange({ ...sectionData, photos: { ...sectionPhotos, [fieldKey]: [...existing, ...urls] } });
  };
  const removePhoto = (fieldKey, idx) => {
    const updated = (sectionPhotos[fieldKey] || []).filter((_, i) => i !== idx);
    onChange({ ...sectionData, photos: { ...sectionPhotos, [fieldKey]: updated } });
  };

  // Section-level photo & comment (for sections without per-field photo)
  const setSectionComment = (val) => onChange({ ...sectionData, comment: val });
  const addSectionPhotos = (urls) => {
    onChange({ ...sectionData, sectionPhotos: [...(sectionData.sectionPhotos || []), ...urls] });
  };
  const removeSectionPhoto = (idx) => {
    const updated = (sectionData.sectionPhotos || []).filter((_, i) => i !== idx);
    onChange({ ...sectionData, sectionPhotos: updated });
  };

  const hasPerFieldPhotoComment = section.fields.some(f => f.hasPhotoComment);

  return (
    <div className={cn('border rounded-xl overflow-hidden', showErrors && status !== 'complete' ? 'border-red-200' : 'border-border')}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0 transition-colors', statusColor)} />
          <span className="font-semibold text-sm text-left">{section.title}</span>
          {showErrors && status !== 'complete' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-card border-t border-border space-y-4">
          {section.fields.map(field => {
            const isNo = answers[field.key] === 'no';
            const needsComment = isNo && !comments[field.key];
            const needsPhoto = isNo && !(sectionPhotos[field.key]?.length > 0);
            const fieldHasError = showErrors && (!answers[field.key] && answers[field.key] !== '0');

            return (
              <div key={field.key} className="space-y-2">
                <Label className={cn('text-sm font-medium', fieldHasError && 'text-red-500')}>{field.label}</Label>
                {field.type === 'yesno' && (
                  <YesNoField
                    value={answers[field.key]}
                    onChange={v => setAnswer(field.key, v)}
                    hasError={fieldHasError}
                  />
                )}
                {field.type === 'count' && (
                  <CountField
                    value={answers[field.key]}
                    onChange={v => setAnswer(field.key, v)}
                    options={field.options}
                    hasError={fieldHasError}
                  />
                )}

                {isNo && field.hasPhotoComment && (
                  <div className="ml-0 pl-3 border-l-2 border-red-200 space-y-3">
                    <div>
                      <Label className={cn('text-xs', needsComment && showErrors ? 'text-red-500' : 'text-muted-foreground')}>
                        Комментарий {needsComment && showErrors ? '(обязательно)' : ''}
                      </Label>
                      <Textarea
                        value={comments[field.key] || ''}
                        onChange={e => setComment(field.key, e.target.value)}
                        placeholder="Опишите проблему..."
                        rows={2}
                        className={cn('mt-1', needsComment && showErrors && 'border-red-300 focus:border-red-400')}
                      />
                    </div>
                    <div>
                      <Label className={cn('text-xs mb-1 block', needsPhoto && showErrors ? 'text-red-500' : 'text-muted-foreground')}>
                        Фото {needsPhoto && showErrors ? '(обязательно)' : ''}
                      </Label>
                      <PhotoUpload
                        photos={sectionPhotos[field.key] || []}
                        onAdd={urls => addPhotos(field.key, urls)}
                        onRemove={idx => removePhoto(field.key, idx)}
                      />
                    </div>
                  </div>
                )}

                {isNo && !field.hasPhotoComment && (
                  <div className="pl-3 border-l-2 border-red-200 space-y-2">
                    <Label className={cn('text-xs', showErrors ? 'text-red-500' : 'text-muted-foreground')}>
                      Причина {showErrors ? '(обязательно)' : ''}
                    </Label>
                    <Textarea
                      value={comments[field.key] || ''}
                      onChange={e => setComment(field.key, e.target.value)}
                      placeholder="Укажите причину..."
                      rows={2}
                      className={cn(needsComment && showErrors && 'border-red-300')}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Section-level photo & comment for non-per-field sections */}
          {!hasPerFieldPhotoComment && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Добавить фото</Label>
                <PhotoUpload
                  photos={sectionData.sectionPhotos || []}
                  onAdd={addSectionPhotos}
                  onRemove={removeSectionPhoto}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Выполненные работы / Комментарии</Label>
                <Textarea
                  value={sectionData.comment || ''}
                  onChange={e => setSectionComment(e.target.value)}
                  placeholder="Опишите выполненные работы..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function isChecklistComplete(sections) {
  return CHECKLIST_SECTIONS.every(section => {
    const sectionData = sections[section.key] || {};
    return getSectionStatus(section, sectionData) === 'complete';
  });
}

export default function ChecklistForm({ value = {}, onChange, showErrors = false }) {
  const handleSectionChange = (sectionKey, sectionData) => {
    onChange({ ...value, [sectionKey]: sectionData });
  };

  return (
    <div className="space-y-2">
      {CHECKLIST_SECTIONS.map(section => (
        <SectionBlock
          key={section.key}
          section={section}
          sectionData={value[section.key]}
          onChange={data => handleSectionChange(section.key, data)}
          showErrors={showErrors}
        />
      ))}
    </div>
  );
}