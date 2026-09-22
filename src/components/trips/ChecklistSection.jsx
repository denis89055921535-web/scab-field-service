import { useState } from 'react';
import { ChevronDown, ChevronRight, Camera, Images, Loader2, X, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { takeAndSavePhoto, takeAndSaveMultiplePhotos } from '@/lib/photoService';
import SmartPhoto from '@/components/common/SmartPhoto';
import FileAttach from '@/components/common/FileAttach';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const CHECKLIST_SECTIONS = [
  {
    key: 'preparation',
    title: 'Подготовка к выезду',
    fields: [
      { key: 'trunk_photo', label: 'Фото багажника/фото инструментов и ЗИП для данной операции', type: 'photo' },
      { key: 'zip', label: 'Наличие ЗИП', type: 'yesno' },
      { key: 'antenna', label: 'Корпусная антенна', type: 'yesno' },
      { key: 'reader_cable', label: 'Ридер. Кабель Type-C', type: 'yesno' },
      { key: 'twisted_pair', label: 'Кабель витой пары', type: 'yesno' },
      { key: 'metal_hose', label: 'Металлорукав', type: 'yesno' },
      { key: 'corrugated_cable', label: 'Гофрированный кабель', type: 'yesno' },
      { key: 'laptop', label: 'Ноутбук с сетевым адаптером', type: 'yesno' },
      { key: 'tsd', label: 'ТСД', type: 'yesno' },
      { key: 'toolbox', label: 'Ящик с ручным инструментом', type: 'yesno' },
      { key: 'ppe', label: 'СИЗ, страховочный пояс для работ на высоте', type: 'yesno' },
      { key: 'rfid_tag', label: 'Тестовая RFID-метка', type: 'yesno' },
      { key: 'rechip_kit', label: 'Комплект для перечиповки', type: 'yesno' },
      { key: 'cable_connectors', label: 'Разъемы для кабельной сборки', type: 'yesno' },
    ],
  },
  {
    key: 'equipment',
    hasSectionPhoto: true,
    title: 'Проверка оборудования',
    fields: [
      { key: 'availability', label: 'Проверка доступности оборудования', type: 'yesno', hasPhotoComment: true },
      { key: 'internet', label: 'Проверка доступности сети Интернет', type: 'yesno', hasPhotoComment: true },
      { key: 'mpc', label: 'Проверка работы служб на МРС / миниПК', type: 'yesno', hasPhotoComment: true },
      { key: 'tsd', label: 'Проверка ТСД', type: 'yesno', hasPhotoComment: true },
    ],
  },
  {
    key: 'antennas',
    hasSectionPhoto: true,
    title: 'Антенны',
    fields: [
      { key: 'visual', label: 'Визуальный осмотр', type: 'yesno', hasPhotoComment: true },
      { key: 'test_tag_number', label: 'Номер тестовой метки', type: 'text' },
      { key: 'rfid_dirty', label: 'Проверка тестовой метки на грязные антенны — количество работающих антенн', type: 'count', options: ['1','2','3','4'], hasPhotoComment: true, photoLabel: 'Фото грязных антенн' },
      { key: 'cleaning', label: 'Проведена очистка антенн', type: 'yesno', hasPhotoComment: true },
      { key: 'rfid_clean', label: 'Проверка тестовой метки на чистые антенны — количество работающих антенн', type: 'count', options: ['1','2','3','4'], hasPhotoComment: true, photoLabel: 'Фото чистых антенн' },
      { key: 'position', label: 'Контроль положения антенн', type: 'yesno', hasPhotoComment: true },
      { key: 'structure', label: 'Контроль состояния конструкций', type: 'yesno', hasPhotoComment: true },
      { key: 'sealed', label: 'Система герметична', type: 'yesno', hasPhotoComment: true },
      { key: 'repair', label: 'Ремонт МС / Замена антенн', type: 'yesno', hasPhotoComment: true },
    ],
  },
  {
    key: 'rfid',
    hasSectionPhoto: true,
    title: 'RFID-считыватель / сканер',
    fields: [
      { key: 'indicators', label: 'Проверить индикаторы', type: 'yesno' },
      { key: 'connections', label: 'Проверить соединения', type: 'yesno' },
    ],
  },
  {
    key: 'antenna_feeder',
    hasSectionPhoto: true,
    title: 'Антенно-фидерный тракт',
    fields: [
      { key: 'check', label: 'Проверка антенно-фидерного тракта', type: 'yesno', hasPhotoComment: true },
      { key: 'maintenance', label: 'Обслуживание / восстановление работы', type: 'yesno', hasPhotoComment: true },
    ],
  },
  {
    key: 'cabinets',
    hasSectionPhoto: true,
    title: 'Шкаф модули',
    fields: [
      { key: 'inspection', label: 'Осмотр шкафов', type: 'yesno', hasPhotoComment: true },
      { key: 'grounding', label: 'Проверка заземления', type: 'yesno', hasPhotoComment: true },
      { key: 'power', label: 'Проверка питания', type: 'yesno', hasPhotoComment: true },
      { key: 'comm_lines', label: 'Проверка коммуникационных линий', type: 'yesno', hasPhotoComment: true },
      { key: 'external', label: 'Проверка внешних подключений', type: 'yesno', hasPhotoComment: true },
      { key: 'silica_gel', label: 'Проверка состояния силикагеля', type: 'yesno', hasPhotoComment: true },
      { key: 'rfid_export_file', label: 'Отчёт по выгруженным меткам (Excel)', type: 'file', fileLabel: 'Прикрепить отчёт (Excel)' },
    ],
  },
  {
    key: 'cameras',
    hasSectionPhoto: true,
    title: 'Камеры, радиомост и 4G/LTE роутер',
    fields: [
      { key: 'clean', label: 'Проверить чистоту камер и антенн', type: 'yesno', hasPhotoComment: true },
      { key: 'mounts', label: 'Осмотреть крепления камер и антенн', type: 'yesno', hasPhotoComment: true },
      { key: 'surroundings', label: 'Осмотреть окружающее пространство', type: 'yesno', hasPhotoComment: true },
      { key: 'after_clean', label: 'Проверить работоспособность камер и антенн после очистки', type: 'yesno', hasPhotoComment: true },
      { key: 'connectors', label: 'Проверка разъемов подключения', type: 'yesno', hasPhotoComment: true },
    ],
  },

  {
    key: 'marking',
    title: 'Проверка меток в трубах на столе и на мостках',
    fields: [
      { key: 'tubes_bridges', label: 'Проверка меток в отдельных трубах на раскатных мостках (выгрузка с ТСД)', type: 'yesno', hasPhotoComment: true, hasFile: true },
      { key: 'candles_table', label: 'Проверка меток в составе свечей на роторном столе (выгрузка с ТСД)', type: 'yesno', hasPhotoComment: true, hasFile: true },
    ],
  },
  {
    key: 'rechipping',
    title: 'Перечиповка меток',
    fields: [
      { key: 'rechip_registry', label: 'Реестр перечиповки', type: 'file', fileLabel: 'Прикрепить реестр (Excel/PDF)' },
    ],
  },
];

function getSectionStatus(section, sectionData) {
  const answers = sectionData?.answers || {};
  const allFilled = section.fields.every(f => {
    if (f.type === 'photo') return sectionData?.photos?.[f.key]?.length > 0;
    return answers[f.key] !== undefined && answers[f.key] !== '';
  });
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

  const handleUpload = async () => {
    setUploading(true);
    try {
      const result = await takeAndSavePhoto();
      onAdd([result.url]);
      toast.success(result.local ? 'Фото сохранено на устройстве' : 'Фото загружено');
    } catch (err) {
      if (err?.message && !err.message.includes('не выбран') && !err.message.includes('cancelled')) {
        toast.error('Ошибка фото: ' + err.message);
      }
    }
    setUploading(false);
  };
  const handleUploadMultiple = async () => {
    setUploading(true);
    try {
      const results = await takeAndSaveMultiplePhotos();
      onAdd(results.map(function(r) { return r.url; }));
      toast.success('Добавлено фото: ' + results.length);
    } catch (err) {
      if (err && err.message && !err.message.includes('не выбран') && !err.message.includes('cancelled')) {
        toast.error('Ошибка фото: ' + err.message);
      }
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((url, i) => (
        <div key={i} className="relative w-14 h-14">
          <SmartPhoto src={url} gallery={photos} index={i} className="w-14 h-14 rounded-lg object-cover" alt="" />
          <button type="button" onClick={() => onRemove(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleUpload}
        className={cn(
          'cursor-pointer w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors',
          photos.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted'
        )}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <Camera className={cn('w-4 h-4', photos.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
        )}
      </button>
      <button
        type="button"
        onClick={handleUploadMultiple}
        className={cn(
          'cursor-pointer w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors',
          photos.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted'
        )}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <Images className={cn('w-4 h-4', photos.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
        )}
      </button>
    </div>
  );
}

function SectionBlock({ section, sectionData = {}, onChange, showErrors, readOnly }) {
  const [open, setOpen] = useState(false);

  const answers = sectionData.answers || {};
  const comments = sectionData.comments || {};
  const sectionPhotos = sectionData.photos || {};
  const sectionFiles = sectionData.files || {};
  const setFile = (fieldKey, attachment) => {
    onChange({ ...sectionData, files: { ...sectionFiles, [fieldKey]: attachment } });
  };
  const removeFile = (fieldKey) => {
    const updated = { ...sectionFiles };
    delete updated[fieldKey];
    onChange({ ...sectionData, files: updated });
  };

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
                  <div className={readOnly ? 'pointer-events-none' : ''}>
                    <YesNoField
                      value={answers[field.key]}
                      onChange={v => setAnswer(field.key, v)}
                      hasError={fieldHasError}
                    />
                  </div>
                )}
                {field.type === 'count' && (
                  <div className={readOnly ? 'pointer-events-none' : ''}>
                    <CountField
                      value={answers[field.key]}
                      onChange={v => setAnswer(field.key, v)}
                      options={field.options}
                      hasError={fieldHasError}
                    />
                  </div>
                )}
                {field.type === 'text' && (
                  <Input
                    value={answers[field.key] || ''}
                    onChange={e => setAnswer(field.key, e.target.value)}
                    placeholder={field.placeholder || 'Введите значение...'}
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                )}
                {field.type === 'photo' && (
                  <div>
                    {readOnly ? (
                      <div className="flex flex-wrap gap-2">
                        {(sectionPhotos[field.key] || []).map((url, i) => (
                          <SmartPhoto key={i} src={url} gallery={sectionPhotos[field.key] || []} index={i} className="w-14 h-14 rounded-lg object-cover" alt="" />
                        ))}
                        {!(sectionPhotos[field.key]?.length) && <span className="text-xs text-muted-foreground">Нет фото</span>}
                      </div>
                    ) : (
                      <PhotoUpload
                        photos={sectionPhotos[field.key] || []}
                        onAdd={urls => addPhotos(field.key, urls)}
                        onRemove={idx => removePhoto(field.key, idx)}
                      />
                    )}
                  </div>
                )}
                {field.type === 'file' && (
                  <FileAttach
                    attachment={sectionFiles[field.key]}
                    onAttach={a => setFile(field.key, a)}
                    onRemove={() => removeFile(field.key)}
                    readOnly={readOnly}
                    label={field.fileLabel || 'Прикрепить файл (Excel/PDF)'}
                  />
                )}
                {field.hasFile && (
                  <div className="mt-2">
                    <Label className="text-xs mb-1 block text-muted-foreground">Файл (Excel/PDF)</Label>
                    <FileAttach
                      attachment={sectionFiles[field.key]}
                      onAttach={a => setFile(field.key, a)}
                      onRemove={() => removeFile(field.key)}
                      readOnly={readOnly}
                      label={field.fileLabel || 'Прикрепить файл (Excel/PDF)'}
                    />
                  </div>
                )}

                {(field.hasFile || (isNo && field.type === 'yesno') || (field.type === 'count' && answers[field.key])) && field.hasPhotoComment && (
                  <div className="ml-0 pl-3 border-l-2 border-red-200 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Комментарий</Label>
                      <Textarea
                        value={comments[field.key] || ''}
                        onChange={e => setComment(field.key, e.target.value)}
                        placeholder="Опишите проблему..."
                        rows={2}
                        className="mt-1"
                        readOnly={readOnly}
                        disabled={readOnly}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block text-muted-foreground">{field.photoLabel || 'Фото'}</Label>
                      {readOnly ? (
                        <div className="flex flex-wrap gap-2">
                          {(sectionPhotos[field.key] || []).map((url, i) => (
                            <SmartPhoto key={i} src={url} gallery={sectionPhotos[field.key] || []} index={i} className="w-14 h-14 rounded-lg object-cover" alt="" />
                          ))}
                          {!(sectionPhotos[field.key]?.length) && <span className="text-xs text-muted-foreground">Нет фото</span>}
                        </div>
                      ) : (
                        <PhotoUpload
                          photos={sectionPhotos[field.key] || []}
                          onAdd={urls => addPhotos(field.key, urls)}
                          onRemove={idx => removePhoto(field.key, idx)}
                        />
                      )}
                    </div>
                  </div>
                )}

                {isNo && !field.hasPhotoComment && (
                  <div className="pl-3 border-l-2 border-red-200 space-y-2">
                    <Label className="text-xs text-muted-foreground">Причина</Label>
                    <Textarea
                      value={comments[field.key] || ''}
                      onChange={e => setComment(field.key, e.target.value)}
                      placeholder="Укажите причину..."
                      rows={2}
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Section-level photo & comment for non-per-field sections */}
          {section.hasSectionPhoto && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Фото</Label>
                {readOnly ? (
                  <div className="flex flex-wrap gap-2">
                    {(sectionData.sectionPhotos || []).map((url, i) => (
                      <SmartPhoto key={i} src={url} gallery={sectionData.sectionPhotos || []} index={i} className="w-14 h-14 rounded-lg object-cover" alt="" />
                    ))}
                    {!(sectionData.sectionPhotos?.length) && <span className="text-xs text-muted-foreground">Нет фото</span>}
                  </div>
                ) : (
                  <PhotoUpload
                    photos={sectionData.sectionPhotos || []}
                    onAdd={addSectionPhotos}
                    onRemove={removeSectionPhoto}
                  />
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Выполненные работы / Комментарии</Label>
                <Textarea
                  value={sectionData.comment || ''}
                  onChange={e => setSectionComment(e.target.value)}
                  placeholder="Опишите выполненные работы..."
                  rows={2}
                  className="mt-1"
                  readOnly={readOnly}
                  disabled={readOnly}
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

export default function ChecklistForm({ value = {}, onChange, showErrors = false, readOnly = false }) {
  const handleSectionChange = (sectionKey, sectionData) => {
    if (readOnly) return;
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
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}