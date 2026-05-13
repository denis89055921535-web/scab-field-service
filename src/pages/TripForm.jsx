import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Send, Loader2, Camera, X, FileDown, Mail } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import ChecklistForm, { isChecklistComplete } from '@/components/trips/ChecklistSection';
import { exportToExcel, exportToPDF, sendReportByEmail } from '@/lib/tripExport';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const TRIP_STATUSES = {
  draft: 'Черновик',
  in_progress: 'В работе',
  completed: 'Завершен',
  needs_repeat: 'Требуется повторный выезд',
};

const EMPTY_FORM = {
  trip_date: new Date().toISOString().split('T')[0],
  employee_name: '',
  position: '',
  crew_number: '',
  field_name: '',
  drill_type: '',
  work_type: '',
  bi_kits_numbers: '',
  module_type: '',
  cabinet_type: '',
  reason: '',
  status: 'draft',
  comment: '',
  photos: [],
  checklist: {},
  sections: {},
};

export default function TripForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tripId = window.location.pathname.includes('/trips/')
    ? window.location.pathname.split('/trips/')[1]
    : null;
  const isNew = tripId === 'new';

  const [form, setForm] = useState(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);

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
      const trips = await base44.entities.TripLog.filter({ id: tripId });
      return trips[0];
    },
    enabled: !!tripId && !isNew,
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user && !form.employee_name) {
        setForm(f => ({ ...f, employee_name: user.full_name || '' }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (existingTrip) {
      setForm({
        ...EMPTY_FORM,
        ...existingTrip,
        photos: existingTrip.photos || [],
        sections: existingTrip.sections || {},
        checklist: existingTrip.checklist || {},
      });
    }
  }, [existingTrip]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isNew) return base44.entities.TripLog.create(data);
      return base44.entities.TripLog.update(tripId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success(isNew ? 'Выезд создан' : 'Выезд обновлён');
      navigate('/trips');
    },
  });

  const handleCrewSelect = (crewNumber) => {
    const crew = crews.find(c => c.crew_number === crewNumber);
    setForm(f => ({
      ...f,
      crew_number: crewNumber,
      field_name: crew?.field_name || f.field_name,
      drill_type: crew?.drill_type || f.drill_type,
      bi_kits_numbers: crew?.bi_kits_numbers || f.bi_kits_numbers,
    }));
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
    if (!isChecklistComplete(form.sections)) {
      setShowErrors(true);
      toast.error('Заполните все обязательные поля чек-листа');
      return;
    }
    saveMutation.mutate({ ...form, status: 'completed' });
  };

  const checklistDone = isChecklistComplete(form.sections);

  const handleSendEmail = async (savedTrip) => {
    setSending(true);
    // Get report email from localStorage (set by admin)
    const reportEmail = localStorage.getItem('report_email');
    if (!reportEmail) {
      toast.error('Email для отчётов не задан. Укажите его в настройках администратора.');
      setSending(false);
      return;
    }
    await sendReportByEmail(savedTrip || form, reportEmail);
    toast.success(`Отчёт отправлен на ${reportEmail}`);
    setSending(false);
  };

  const handleSubmitAndSend = async () => {
    if (!isChecklistComplete(form.sections)) {
      setShowErrors(true);
      toast.error('Заполните все обязательные поля чек-листа');
      return;
    }
    const data = { ...form, status: 'completed' };
    saveMutation.mutate(data, {
      onSuccess: async (saved) => {
        await handleSendEmail(saved || data);
      }
    });
  };

  const handleExportExcel = () => exportToExcel(form);
  const handleExportPDF = () => exportToPDF(form);

  return (
    <div className="pb-28">
      <PageHeader
        title={isNew ? 'Новый выезд' : 'Редактирование выезда'}
        backTo="/trips"
      />

      <div className="p-4 space-y-4">
        {/* Основные поля */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Дата выезда *</Label>
            <Input
              type="date"
              value={form.trip_date}
              onChange={e => setForm(f => ({ ...f, trip_date: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Статус выезда</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRIP_STATUSES).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">ФИО сотрудника *</Label>
          <Input
            value={form.employee_name}
            onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
            placeholder="ФИО сотрудника"
          />
        </div>

        <div>
          <Label className="text-xs">Должность</Label>
          <Input
            value={form.position || ''}
            onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
            placeholder="Должность сотрудника"
          />
        </div>

        <div>
          <Label className="text-xs">№ буровой бригады *</Label>
          <Select value={form.crew_number} onValueChange={handleCrewSelect}>
            <SelectTrigger><SelectValue placeholder="Выберите бригаду" /></SelectTrigger>
            <SelectContent>
              {crews.map(c => (
                <SelectItem key={c.id} value={c.crew_number}>
                  №{c.crew_number} — {c.field_name || 'Без месторождения'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Месторождение</Label>
          <Input
            value={form.field_name}
            onChange={e => setForm(f => ({ ...f, field_name: e.target.value }))}
            placeholder="Месторождение"
          />
        </div>

        <div>
          <Label className="text-xs">Тип буровой установки</Label>
          <Input
            value={form.drill_type || ''}
            onChange={e => setForm(f => ({ ...f, drill_type: e.target.value }))}
            placeholder="Например: ZJ-50"
          />
        </div>

        <div>
          <Label className="text-xs">Тип работ</Label>
          <Select value={form.work_type} onValueChange={v => setForm(f => ({ ...f, work_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Выберите тип работ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="maintenance">Обслуживание оборуд.</SelectItem>
              <SelectItem value="bi_accident">Авария БИ</SelectItem>
              <SelectItem value="bi_inspection">Инспекция БИ</SelectItem>
              <SelectItem value="equipment_install">Монтаж оборуд.</SelectItem>
              <SelectItem value="equipment_uninstall">Демонтаж оборуд.</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Комплект БИ</Label>
          {biKitsFromWarehouse.length > 0 ? (
            <Select value={form.bi_kits_numbers} onValueChange={v => setForm(f => ({ ...f, bi_kits_numbers: v }))}>
              <SelectTrigger><SelectValue placeholder="Выберите комплект БИ" /></SelectTrigger>
              <SelectContent>
                {biKitsFromWarehouse.map(kit => (
                  <SelectItem key={kit} value={kit}>{kit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.bi_kits_numbers} onChange={e => setForm(f => ({ ...f, bi_kits_numbers: e.target.value }))} placeholder="Номер комплекта БИ" />
          )}
        </div>

        <div>
          <Label className="text-xs">Причина выезда</Label>
          <Textarea
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="Опишите причину выезда..."
            rows={2}
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
          />
        </div>

        {/* Общий фотоотчёт */}
        <div>
          <Label className="text-xs mb-2 block">Общий фотоотчёт</Label>
          <div className="flex gap-2 flex-wrap">
            {form.photos.map((url, i) => (
              <div key={i} className="relative w-16 h-16">
                <img src={url} className="w-16 h-16 rounded-lg object-cover" alt="" />
                <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <Camera className="w-5 h-5 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        <div>
          <Label className="text-xs">Дополнительный комментарий</Label>
          <Textarea
            value={form.comment}
            onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            placeholder="Дополнительный комментарий..."
            rows={2}
          />
        </div>
      </div>

      {/* Фиксированные кнопки снизу */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex gap-2 max-w-lg mx-auto">
        <Button
          variant="outline"
          className="flex-1 h-11"
          onClick={handleSave}
          disabled={saveMutation.isPending || sending}
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить
        </Button>

        <Button
          className="flex-1 h-11"
          onClick={handleSubmitAndSend}
          disabled={saveMutation.isPending || sending || !checklistDone}
          title={!checklistDone ? 'Заполните все пункты чек-листа' : ''}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Отправить отчёт
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 px-3" title="Выгрузить отчёт">
              <FileDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportExcel}>
              Скачать Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              Скачать PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}