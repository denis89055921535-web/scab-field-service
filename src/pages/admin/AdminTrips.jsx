import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, ChevronDown, ChevronRight, CheckCircle2, XCircle, MinusCircle, Filter, X, Settings, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { CHECKLIST_SECTIONS } from '@/components/trips/ChecklistSection';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const TRIP_STATUSES = {
  draft: { label: 'Черновик', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'В работе', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Завершен', color: 'bg-emerald-100 text-emerald-700' },
  needs_repeat: { label: 'Повторный выезд', color: 'bg-amber-100 text-amber-700' },
  // legacy
  planned: { label: 'Запланирован', color: 'bg-slate-100 text-slate-600' },
};

function ChecklistPreview({ sections = {} }) {
  const [openSection, setOpenSection] = useState(null);

  return (
    <div className="space-y-1.5">
      {CHECKLIST_SECTIONS.map(section => {
        const sectionData = sections[section.key] || {};
        const answers = sectionData.answers || {};
        const isOpen = openSection === section.key;
        const allFilled = section.fields.every(f => answers[f.key] !== undefined && answers[f.key] !== '');
        const hasNo = section.fields.some(f => answers[f.key] === 'no');
        const dot = !allFilled ? 'text-muted-foreground' : hasNo ? 'text-red-500' : 'text-emerald-500';

        return (
          <div key={section.key} className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => setOpenSection(isOpen ? null : section.key)}
            >
              <div className="flex items-center gap-2">
                {!allFilled
                  ? <MinusCircle className={cn('w-4 h-4', dot)} />
                  : hasNo
                  ? <XCircle className={cn('w-4 h-4', dot)} />
                  : <CheckCircle2 className={cn('w-4 h-4', dot)} />
                }
                <span className="font-medium">{section.title}</span>
              </div>
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {isOpen && (
              <div className="px-3 py-2 space-y-1.5 bg-card">
                {section.fields.map(f => {
                  const val = answers[f.key];
                  return (
                    <div key={f.key} className="flex items-start gap-2 text-xs">
                      {val === 'yes' || (f.type === 'count' && val)
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        : val === 'no'
                        ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        : <MinusCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      }
                      <span className="text-muted-foreground">{f.label}</span>
                      {f.type === 'count' && val && <span className="font-semibold text-foreground ml-1">{val}</span>}
                    </div>
                  );
                })}
                {sectionData.comment && (
                  <p className="text-xs text-muted-foreground italic border-t pt-1.5 mt-1.5">{sectionData.comment}</p>
                )}
                {(sectionData.sectionPhotos || []).length > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {sectionData.sectionPhotos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} className="w-12 h-12 rounded object-cover" alt="" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminTrips() {
  const [filters, setFilters] = useState({ status: 'all', search: '', crew: 'all', field: 'all', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [reportEmail, setReportEmail] = useState(() => localStorage.getItem('report_email') || '');
  const [selected, setSelected] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const { data: trips = [] } = useQuery({
    queryKey: ['trips'],
    queryFn: () => base44.entities.TripLog.list('-trip_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TripLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setSelected(null);
      toast.success('Выезд удалён');
    },
  });

  const uniqueCrews = [...new Set(trips.map(t => t.crew_number).filter(Boolean))].sort();
  const uniqueFields = [...new Set(trips.map(t => t.field_name).filter(Boolean))].sort();

  const filtered = trips.filter(t => {
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.crew !== 'all' && t.crew_number !== filters.crew) return false;
    if (filters.field !== 'all' && t.field_name !== filters.field) return false;
    if (filters.dateFrom && t.trip_date < filters.dateFrom) return false;
    if (filters.dateTo && t.trip_date > filters.dateTo) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!t.crew_number?.toLowerCase().includes(q) &&
          !t.employee_name?.toLowerCase().includes(q) &&
          !t.field_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const resetFilters = () => setFilters({ status: 'all', search: '', crew: 'all', field: 'all', dateFrom: '', dateTo: '' });
  const hasActiveFilters = filters.status !== 'all' || filters.crew !== 'all' || filters.field !== 'all' || filters.dateFrom || filters.dateTo || filters.search;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-xl font-bold">Журнал выездов</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailSettings(v => !v)}
            className="gap-2"
          >
            <Mail className="w-3.5 h-3.5" />
            Email отчётов
          </Button>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(v => !v)}
            className="gap-2"
          >
            <Filter className="w-3.5 h-3.5" />
            Фильтры
            {hasActiveFilters && <span className="bg-primary-foreground text-primary rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">!</span>}
          </Button>
        </div>
      </div>

      {showEmailSettings && (
        <Card className="p-4 mb-4">
          <p className="text-sm font-semibold mb-2">Настройка Email для отчётов</p>
          <p className="text-xs text-muted-foreground mb-3">На этот адрес будут приходить отчёты при нажатии «Отправить отчёт» в журнале выезда.</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="example@company.com"
              value={reportEmail}
              onChange={e => setReportEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={() => {
                localStorage.setItem('report_email', reportEmail);
                toast.success('Email сохранён');
                setShowEmailSettings(false);
              }}
            >
              Сохранить
            </Button>
          </div>
          {reportEmail && localStorage.getItem('report_email') === reportEmail && (
            <p className="text-xs text-emerald-600 mt-2">✓ Текущий email: {reportEmail}</p>
          )}
        </Card>
      )}

      {showFilters && (
        <Card className="p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Поиск</label>
              <Input
                placeholder="Бригада, сотрудник, месторождение..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Статус</label>
              <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Все статусы" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {Object.entries(TRIP_STATUSES).map(([k, { label }]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Бригада</label>
              <Select value={filters.crew} onValueChange={v => setFilters(f => ({ ...f, crew: v }))}>
                <SelectTrigger><SelectValue placeholder="Все бригады" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все бригады</SelectItem>
                  {uniqueCrews.map(c => <SelectItem key={c} value={c}>№{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Месторождение</label>
              <Select value={filters.field} onValueChange={v => setFilters(f => ({ ...f, field: v }))}>
                <SelectTrigger><SelectValue placeholder="Все месторождения" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все месторождения</SelectItem>
                  {uniqueFields.map(fi => <SelectItem key={fi} value={fi}>{fi}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Дата с</label>
              <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Дата по</label>
              <Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
            </div>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground gap-1.5">
              <X className="w-3.5 h-3.5" /> Сбросить фильтры
            </Button>
          )}
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Бригада</TableHead>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Месторождение</TableHead>
                <TableHead>Статус</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет записей</TableCell>
                </TableRow>
              )}
              {filtered.map(trip => (
                <TableRow key={trip.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(trip)}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {trip.trip_date ? format(new Date(trip.trip_date), 'd MMM yyyy', { locale: ru }) : '—'}
                  </TableCell>
                  <TableCell className="font-medium">№{trip.crew_number}</TableCell>
                  <TableCell>{trip.employee_name || '—'}</TableCell>
                  <TableCell>{trip.field_name || '—'}</TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', TRIP_STATUSES[trip.status]?.color || 'bg-slate-100 text-slate-600')}>
                      {TRIP_STATUSES[trip.status]?.label || trip.status || '—'}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(trip.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Выезд — Бригада №{selected.crew_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Дата</p><p className="font-medium">{selected.trip_date ? format(new Date(selected.trip_date), 'd MMMM yyyy', { locale: ru }) : '—'}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Статус</p>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', TRIP_STATUSES[selected.status]?.color || 'bg-slate-100 text-slate-600')}>
                      {TRIP_STATUSES[selected.status]?.label || selected.status || '—'}
                    </span>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Сотрудник</p><p className="font-medium">{selected.employee_name || '—'}</p></div>
                  {selected.position && <div><p className="text-xs text-muted-foreground">Должность</p><p className="font-medium">{selected.position}</p></div>}
                  <div><p className="text-xs text-muted-foreground">Месторождение</p><p className="font-medium">{selected.field_name || '—'}</p></div>
                  {selected.drill_type && <div><p className="text-xs text-muted-foreground">Тип буровой</p><p className="font-medium">{selected.drill_type}</p></div>}
                </div>
                {selected.reason && <div><p className="text-xs text-muted-foreground">Причина</p><p className="text-sm">{selected.reason}</p></div>}

                {selected.sections && Object.keys(selected.sections).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Чек-лист</p>
                    <ChecklistPreview sections={selected.sections} />
                  </div>
                )}

                {selected.comment && <div><p className="text-xs text-muted-foreground">Комментарий</p><p className="text-sm">{selected.comment}</p></div>}
                {selected.photos?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Фотоотчёт</p>
                    <div className="flex gap-2 flex-wrap">
                      {selected.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} className="w-20 h-20 rounded-lg object-cover" alt="" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}