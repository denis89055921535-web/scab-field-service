import { checkOnline } from '@/lib/network';
import { outboxGet, outboxUpdate, outboxRemove } from '@/lib/offlineDb';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save, Loader2, Camera, X, FileDown, Mail, Plus, Trash2, MapPin, CheckCircle2 } from 'lucide-react';
import MobileSelect from '@/components/common/MobileSelect';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import ChecklistForm from '@/components/trips/ChecklistSection';
import { exportToExcel, sendReportByEmail } from '@/lib/tripExport';
import { crewStatuses } from '@/lib/statusConfig';
import { usePartner } from '@/lib/PartnerContext';

const TRIP_STATUSES = {
  draft: 'Черновик',
  in_progress: 'В работе',
  completed: 'Завершен',
  needs_repeat: 'Требуется повторный выезд',
};

const EMPTY_EMPLOYEES = [{ name: '', position: '' }];

const EMPTY_FORM = {
  trip_date: new Date().toISOString().split('T')[0],
  employee_name: '',
  position: '',
  employees_list: EMPTY_EMPLOYEES,
  crew_number: '',
  field_name: '',
  drill_type: '',
  work_type: '',
  crew_status: '',
  bi_kits_numbers: '',
  bi_kits_list: [''],
  module_type: '',
  cabinet_type: '',
  reason: '',
  status: 'draft',
  comment: '',
  photos: [],
  checklist: {},
  sections: {},
  partner: '',
};

export default function TripForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tripId = window.location.pathname.includes('/trips/')
    ? window.location.pathname.split('/trips/')[1]
    : null;
  const isNew = tripId === 'new';

  const { partner } = usePartner();
  const [form, setForm] = useState({ ...EMPTY_FORM, partner: partner || '' });
  const [employees, setEmployees] = useState(EMPTY_EMPLOYEES);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // Запрет редактирования для любых сохранённых выездов
  const isReadOnly = !isNew && !!form.email_sent;

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const biKitsFromWarehouse = assets.filter(a => a.asset_type === 'bi_kit').map(a => a.name);
  const modulesFromWarehouse = assets.filter(a => a.asset_type === 'reader_module').map(a => a.name);
  const cabinetsFromWarehouse = assets.filter(a => a.asset_type === 'cabinet').map(a => a.name);

  const { data: existingTrip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const local = await outboxGet(tripId);
      if (local) return { ...local.data, _local: true, _localId: local.localId };
      const trips = await base44.entities.TripLog.filter({ id: tripId });
      return trips[0];
    },
    enabled: !!tripId && !isNew,
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user && !form.employee_name) {
        const initialEmployees = [{ name: user.full_name || '', position: '' }];
        setEmployees(initialEmployees);
        setForm(f => ({ ...f, employee_name: user.full_name || '', partner: partner || '' }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (existingTrip) {
      const biList = existingTrip.bi_kits_list?.length
        ? existingTrip.bi_kits_list
        : existingTrip.bi_kits_numbers
          ? existingTrip.bi_kits_numbers.split(',').map(s => s.trim()).filter(Boolean)
          : [''];
      // Восстанавливаем список сотрудников
      const loadedEmployees = existingTrip.employees_list?.length
        ? existingTrip.employees_list
        : existingTrip.employee_name
          ? [{ name: existingTrip.employee_name, position: existingTrip.position || '' }]
          : EMPTY_EMPLOYEES;
      setEmployees(loadedEmployees);
      setForm({
        ...EMPTY_FORM,
        ...existingTrip,
        photos: existingTrip.photos || [],
        sections: existingTrip.sections || {},
        checklist: existingTrip.checklist || {},
        bi_kits_list: biList,
        employees_list: loadedEmployees,
      });
    }
  }, [existingTrip]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Если это локальный отчёт (лежит в outbox) — сохраняем обратно туда
      if (form._local && form._localId) {
        await outboxUpdate(form._localId, { data: { ...data, id: form._localId } });
        return { ...data, id: form._localId, _local: true, _offline: true };
      }
      if (isNew) return base44.entities.TripLog.create(data);
      return base44.entities.TripLog.update(tripId, data);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      const offline = saved?._offline;
      toast.success(offline ? 'Сохранено на устройстве (не отправлено)' : (isNew ? 'Выезд создан' : 'Выезд обновлён'));
      if (isNew) {
        navigate('/trips');
      } else if (saved) {
        setForm(f => ({ ...f, ...saved }));
      }
    },
    onError: (err) => {
      toast.error('Ошибка сохранения: ' + (err.message || 'неизвестная'));
    },
  });

  const updateEmployees = (newList) => {
    setEmployees(newList);
    setForm(f => ({
      ...f,
      employees_list: newList,
      employee_name: newList.map(e => e.name).filter(Boolean).join(', '),
      position: newList.map(e => e.position).filter(Boolean).join(', '),
    }));
  };

  const handleCrewSelect = (crewNumber) => {
    const crew = crews.find(c => c.crew_number === crewNumber);
    const biList = crew?.bi_kits_numbers
      ? crew.bi_kits_numbers.split(',').map(s => s.trim()).filter(Boolean)
      : [''];
    setForm(f => ({
      ...f,
      crew_number: crewNumber,
      field_name: crew?.field_name || f.field_name,
      drill_type: crew?.drill_type || f.drill_type,
      bi_kits_numbers: crew?.bi_kits_numbers || f.bi_kits_numbers,
      bi_kits_list: biList,
    }));
  };

  const updateBiKit = (idx, value) => {
    setForm(f => {
      const list = [...(f.bi_kits_list || [''])];
      list[idx] = value;
      return { ...f, bi_kits_list: list, bi_kits_numbers: list.filter(Boolean).join(', ') };
    });
  };

  const addBiKit = () => {
    setForm(f => ({ ...f, bi_kits_list: [...(f.bi_kits_list || ['']), ''] }));
  };

  const removeBiKit = (idx) => {
    setForm(f => {
      const list = (f.bi_kits_list || ['']).filter((_, i) => i !== idx);
      const final = list.length ? list : [''];
      return { ...f, bi_kits_list: final, bi_kits_numbers: final.filter(Boolean).join(', ') };
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photos: [...f.photos, file_url] }));
    toast.success('Фото загружено');
  };

  const removePhoto = (idx) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const handleSubmit = () => {
    saveMutation.mutate({ ...form, status: 'completed' });
  };

  const handleSendEmail = async (savedTrip) => {
    setSending(true);
    try {
      await sendReportByEmail(savedTrip || form);
      toast.success('Отчёт отправлен на ваш email');
      if (!(savedTrip || form).email_sent) {
        saveMutation.mutate({ ...(savedTrip || form), email_sent: true });
      }
    } catch {
      toast.error('Ошибка отправки');
    }
    setSending(false);
  };

const handleSubmitAndSend = async () => {
    const online = await checkOnline();
    if (!online) {
      // Офлайн — письмо отправить нельзя, сохраняем как "не отправлен"
      saveMutation.mutate({ ...form, status: 'completed', email_sent: false });
      toast('Нет интернета. Отчёт сохранён — отправьте его, когда появится сеть.');
      return;
    }
    // Онлайн — сохраняем на сервер и отправляем письмо
    setSending(true);
    try {
      const data = { ...form, status: 'completed', email_sent: true };
      // Убираем служебные поля офлайна перед отправкой
      delete data._local;
      delete data._localId;
      delete data._offline;
      delete data._syncStatus;
      if (isNew || form._local) {
        // Новый или локальный (его ещё нет на сервере) — создаём
        await base44.entities.TripLog.create(data);
        // Локальный отправлен — убираем из очереди
        if (form._localId) await outboxRemove(form._localId);
      } else {
        await base44.entities.TripLog.update(tripId, data);
      }
      await sendReportByEmail(data);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Отчёт сохранён и отправлен на email');
      navigate('/trips');
    } catch (err) {
      toast.error('Ошибка отправки: ' + (err.message || 'неизвестная'));
    } finally {
      setSending(false);
    }
  };

  const handleExportExcel = () => exportToExcel(form);

  const handleGetGeo = () => {
    if (!navigator.geolocation) {
      toast.error('Геолокация не поддерживается браузером');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          gps_lat: pos.coords.latitude,
          gps_lon: pos.coords.longitude,
          gps_accuracy: Math.round(pos.coords.accuracy),
          gps_timestamp: new Date().toISOString(),
        }));
        setGeoLoading(false);
        toast.success('Геопозиция получена');
      },
      (err) => {
        setGeoLoading(false);
        toast.error('Не удалось получить геопозицию: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="pb-28">
      <PageHeader
        title={isNew ? 'Новый выезд' : isReadOnly ? 'Просмотр выезда' : 'Редактирование выезда'}
        backTo="/trips"
      />

      {isReadOnly && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          Выезд сохранён и не может быть изменён
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Основные поля */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Дата выезда *</Label>
            <Input
              type="date"
              value={form.trip_date}
              onChange={e => setForm(f => ({ ...f, trip_date: e.target.value }))}
              readOnly={isReadOnly}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label className="text-xs">Статус выезда</Label>
            <MobileSelect
              value={form.status}
              onValueChange={v => setForm(f => ({ ...f, status: v }))}
              placeholder="Статус"
              options={Object.entries(TRIP_STATUSES).map(([k, label]) => ({ value: k, label }))}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {form.partner && (
          <div className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium">
            Партнёр: {form.partner}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Сотрудники *</Label>
            {!isReadOnly && (
              <button type="button" onClick={() => updateEmployees([...employees, { name: '', position: '' }])} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3 h-3" /> Добавить
              </button>
            )}
          </div>
          <div className="space-y-2">
            {employees.map((emp, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={emp.name}
                    onChange={e => { const u = [...employees]; u[idx] = { ...u[idx], name: e.target.value }; updateEmployees(u); }}
                    placeholder="ФИО сотрудника"
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                  />
                  <MobileSelect
                    value={emp.position || ''}
                    onValueChange={v => { const u = [...employees]; u[idx] = { ...u[idx], position: v }; updateEmployees(u); }}
                    placeholder="Должность"
                    disabled={isReadOnly}
                    options={[
                      { value: 'Техник', label: 'Техник' },
                      { value: 'Инженер', label: 'Инженер' },
                      { value: 'Супервайзер', label: 'Супервайзер' },
                    ]}
                  />
                </div>
                {!isReadOnly && employees.length > 1 && (
                  <button type="button" onClick={() => updateEmployees(employees.filter((_, i) => i !== idx))} className="text-destructive hover:opacity-70 mt-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">№ буровой бригады *</Label>
          <MobileSelect
            value={form.crew_number}
            onValueChange={handleCrewSelect}
            placeholder="Выберите бригаду"
            options={crews.map(c => ({ value: c.crew_number, label: `№${c.crew_number} — ${c.field_name || 'Без месторождения'}` }))}
            disabled={isReadOnly}
          />
        </div>

        <div>
          <Label className="text-xs">Месторождение</Label>
          <Input
            value={form.field_name}
            onChange={e => setForm(f => ({ ...f, field_name: e.target.value }))}
            placeholder="Месторождение"
            readOnly={isReadOnly}
            disabled={isReadOnly}
          />
        </div>

        <div>
          <Label className="text-xs">Тип буровой установки</Label>
          <Input
            value={form.drill_type || ''}
            onChange={e => setForm(f => ({ ...f, drill_type: e.target.value }))}
            placeholder="Например: ZJ-50"
            readOnly={isReadOnly}
            disabled={isReadOnly}
          />
        </div>

        <div>
          <Label className="text-xs">Тип работ</Label>
          <MobileSelect
            value={form.work_type}
            onValueChange={v => setForm(f => ({ ...f, work_type: v }))}
            placeholder="Выберите тип работ"
            disabled={isReadOnly}
            options={[
              { value: 'maintenance', label: 'Обслуживание оборуд.' },
              { value: 'bi_accident', label: 'Авария БИ' },
              { value: 'bi_inspection', label: 'Инспекция/Перечиповка БИ' },
              { value: 'equipment_install', label: 'Монтаж оборуд.' },
              { value: 'equipment_uninstall', label: 'Демонтаж оборуд.' },
            ]}
          />
        </div>

        <div>
          <Label className="text-xs">Статус бригады</Label>
          <MobileSelect
            value={form.crew_status}
            onValueChange={v => setForm(f => ({ ...f, crew_status: v }))}
            placeholder="Выберите статус бригады"
            disabled={isReadOnly}
            options={Object.entries(crewStatuses).map(([k, { label }]) => ({ value: k, label }))}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Комплект БИ</Label>
            {!isReadOnly && (
              <button type="button" onClick={addBiKit} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3 h-3" /> Добавить
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(form.bi_kits_list || ['']).map((kit, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                {biKitsFromWarehouse.length > 0 ? (
                  <MobileSelect
                    value={kit}
                    onValueChange={v => updateBiKit(idx, v)}
                    placeholder="Выберите комплект БИ"
                    options={biKitsFromWarehouse.map(k => ({ value: k, label: k }))}
                    triggerClassName="flex-1"
                    disabled={isReadOnly}
                  />
                ) : (
                  <Input
                    className="flex-1"
                    value={kit}
                    onChange={e => updateBiKit(idx, e.target.value)}
                    placeholder="Номер комплекта БИ"
                    readOnly={isReadOnly}
                    disabled={isReadOnly}
                  />
                )}
                {!isReadOnly && (form.bi_kits_list || ['']).length > 1 && (
                  <button type="button" onClick={() => removeBiKit(idx)} className="text-destructive hover:opacity-70">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">Причина выезда</Label>
          <Textarea
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="Опишите причину выезда..."
            rows={2}
            readOnly={isReadOnly}
            disabled={isReadOnly}
          />
        </div>

        {/* Чек-лист */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Чек-лист полевого сотрудника АРБИ
          </p>
          <ChecklistForm
            value={form.sections}
            onChange={sections => setForm(f => ({ ...f, sections }))}
            showErrors={showErrors}
            readOnly={isReadOnly}
          />
        </div>

        {/* Общий фотоотчёт */}
        <div>
          <Label className="text-xs mb-2 block">Общий фотоотчёт</Label>
          <div className="flex gap-2 flex-wrap">
            {form.photos.map((url, i) => (
              <div key={i} className="relative w-16 h-16">
                <img src={url} className="w-16 h-16 rounded-lg object-cover" alt="" />
                {!isReadOnly && (
                  <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
            {!isReadOnly && (
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
        </div>

        {/* Геопозиция */}
        <div>
          <Label className="text-xs mb-2 block">Геопозиция с места</Label>
          {form.gps_lat ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-800 dark:text-green-400">
                  {Number(form.gps_lat).toFixed(5)}, {Number(form.gps_lon).toFixed(5)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  Точность: ±{form.gps_accuracy} м
                  {form.gps_timestamp && ` · ${new Date(form.gps_timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
              <a
                href={`https://maps.google.com/?q=${form.gps_lat},${form.gps_lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline flex-shrink-0"
              >
                Карта
              </a>
              {!isReadOnly && (
                <button type="button" onClick={() => setForm(f => ({ ...f, gps_lat: null, gps_lon: null, gps_accuracy: null, _timestamp: null }))} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            !isReadOnly && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={handleGetGeo}
                disabled={geoLoading}
              >
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {geoLoading ? 'Получение геопозиции...' : 'Отправить геопозицию'}
              </Button>
            )
          )}
        </div>

        <div>
          <Label className="text-xs">Дополнительный комментарий</Label>
          <Textarea
            value={form.comment}
            onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            placeholder="Дополнительный комментарий..."
            rows={2}
            readOnly={isReadOnly}
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Фиксированные кнопки снизу */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-2 max-w-lg mx-auto">
        {!isReadOnly && (
          <Button
            variant="outline"
            className="h-11 px-3"
            onClick={handleSave}
            disabled={saveMutation.isPending || sending}
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        )}

        {!isReadOnly && (
          <Button
            className="flex-1 h-11"
            onClick={handleSubmitAndSend}
            disabled={saveMutation.isPending || sending}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Отправить отчёт
          </Button>
        )}
        {isReadOnly && (
          <Button
            className="flex-1 h-11"
            onClick={() => handleSendEmail(form)}
            disabled={sending}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Отправить отчёт
          </Button>
        )}

        <Button
          variant="outline"
          className={isReadOnly ? 'flex-1 h-11' : 'flex-1 h-11'}
          onClick={handleExportExcel}
          title="Скачать Excel"
        >
          <FileDown className="w-4 h-4" />
          Excel
        </Button>
      </div>
    </div>
  );
}