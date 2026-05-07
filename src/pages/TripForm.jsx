import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { tripStatuses, checklistItems } from '@/lib/statusConfig';


export default function TripForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tripId = window.location.pathname.includes('/trips/') 
    ? window.location.pathname.split('/trips/')[1] 
    : null;
  const isNew = tripId === 'new';

  const [form, setForm] = useState({
    trip_date: new Date().toISOString().split('T')[0],
    employee_name: '',
    crew_number: '',
    field_name: '',
    bi_kits_numbers: '',
    reason: '',
    status: 'planned',
    comment: '',
    photos: [],
    checklist: {},
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list(),
  });

  const { data: existingTrip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const trips = await base44.entities.TripLog.filter({ id: tripId });
      return trips[0];
    },
    enabled: !!tripId && !isNew,
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      if (user && !form.employee_name) {
        setForm(f => ({ ...f, employee_name: user.full_name || '' }));
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (existingTrip) {
      setForm({
        trip_date: existingTrip.trip_date || '',
        employee_name: existingTrip.employee_name || '',
        crew_number: existingTrip.crew_number || '',
        field_name: existingTrip.field_name || '',
        bi_kits_numbers: existingTrip.bi_kits_numbers || '',
        reason: existingTrip.reason || '',
        status: existingTrip.status || 'planned',
        comment: existingTrip.comment || '',
        photos: existingTrip.photos || [],
        checklist: existingTrip.checklist || {},
      });
    }
  }, [existingTrip]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        return base44.entities.TripLog.create(data);
      }
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

  const toggleCheck = (key) => {
    setForm(f => ({
      ...f,
      checklist: { ...f.checklist, [key]: !f.checklist[key] },
    }));
  };

  return (
    <div>
      <PageHeader
        title={isNew ? 'Новый выезд' : 'Редактирование'}
        backTo="/trips"
      />

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Дата выезда</Label>
            <Input
              type="date"
              value={form.trip_date}
              onChange={e => setForm({ ...form, trip_date: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Статус</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(tripStatuses).map(([k, { label }]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Сотрудник</Label>
          <Input
            value={form.employee_name}
            onChange={e => setForm({ ...form, employee_name: e.target.value })}
            placeholder="ФИО сотрудника"
          />
        </div>

        <div>
          <Label className="text-xs">Буровая бригада</Label>
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
            onChange={e => setForm({ ...form, field_name: e.target.value })}
            placeholder="Месторождение"
          />
        </div>

        <div>
          <Label className="text-xs">Комплекты БИ</Label>
          {(() => {
            const crew = crews.find(c => c.crew_number === form.crew_number);
            const availableKits = crew?.bi_kits_numbers
              ? crew.bi_kits_numbers.split(',').map(s => s.trim()).filter(Boolean)
              : [];
            const selectedKits = form.bi_kits_numbers
              ? form.bi_kits_numbers.split(',').map(s => s.trim()).filter(Boolean)
              : [];

            const toggleKit = (kit) => {
              const updated = selectedKits.includes(kit)
                ? selectedKits.filter(k => k !== kit)
                : [...selectedKits, kit];
              setForm(f => ({ ...f, bi_kits_numbers: updated.join(', ') }));
            };

            if (availableKits.length > 0) {
              return (
                <div className="space-y-2 mt-1">
                  {availableKits.map(kit => (
                    <label key={kit} className="flex items-center gap-3 cursor-pointer p-2 rounded-md border border-border hover:bg-muted transition-colors">
                      <Checkbox
                        checked={selectedKits.includes(kit)}
                        onCheckedChange={() => toggleKit(kit)}
                      />
                      <span className="text-sm">{kit}</span>
                    </label>
                  ))}
                </div>
              );
            }
            return (
              <Input value={form.bi_kits_numbers} onChange={e => setForm(f => ({ ...f, bi_kits_numbers: e.target.value }))} placeholder="Номер комплекта БИ" />
            );
          })()}
        </div>

        <div>
          <Label className="text-xs">Причина выезда</Label>
          <Textarea
            value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })}
            placeholder="Опишите причину выезда..."
            className="h-20"
          />
        </div>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Чек-лист работ</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            {checklistItems.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={!!form.checklist[key]}
                  onCheckedChange={() => toggleCheck(key)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <div>
          <Label className="text-xs">Комментарий</Label>
          <Textarea
            value={form.comment}
            onChange={e => setForm({ ...form, comment: e.target.value })}
            placeholder="Дополнительный комментарий..."
            className="h-20"
          />
        </div>

        <div>
          <Label className="text-xs mb-2 block">Фотоотчёт</Label>
          <div className="flex gap-2 flex-wrap">
            {form.photos.map((url, i) => (
              <img key={i} src={url} className="w-16 h-16 rounded-lg object-cover" alt="" />
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <Camera className="w-5 h-5 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        <Button
          className="w-full h-12 text-sm font-semibold"
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isNew ? 'Сохранить выезд' : 'Обновить выезд'}
        </Button>
      </div>
    </div>
  );
}