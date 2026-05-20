import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Plus, Calendar, MapPin, User, Briefcase, RefreshCw, Download, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { exportSummaryToExcel } from '@/lib/tripExport';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import MobileSelect from '@/components/common/MobileSelect';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { tripStatuses } from '@/lib/statusConfig';
import { usePartner } from '@/lib/PartnerContext';

const workTypeLabels = {
  maintenance: 'Обслуживание оборуд.',
  bi_accident: 'Авария БИ',
  bi_inspection: 'Инспекция БИ',
  equipment_install: 'Монтаж оборуд.',
  equipment_uninstall: 'Демонтаж оборуд.',
};

export default function Trips() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { partner } = usePartner();
  const [crewFilter, setCrewFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const { containerRef, pullDistance, pulling } = usePullToRefresh(() =>
    queryClient.invalidateQueries({ queryKey: ['trips'] })
  );

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips', currentUser?.email],
    queryFn: () => currentUser?.role === 'admin'
      ? base44.entities.TripLog.list('-trip_date')
      : base44.entities.TripLog.filter({ created_by: currentUser.email }, '-trip_date'),
    enabled: !!currentUser,
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list(),
  });

  const filteredTrips = trips.filter(t => {
    if (crewFilter !== 'all' && t.crew_number !== crewFilter) return false;
    if (employeeFilter && !t.employee_name?.toLowerCase().includes(employeeFilter.toLowerCase())) return false;
    if (dateFrom && t.trip_date && t.trip_date < dateFrom) return false;
    if (dateTo && t.trip_date && t.trip_date > dateTo) return false;
    if (partner && t.partner && t.partner !== partner) return false;
    return true;
  });

  // Get unique crew numbers from trips for filter options
  const crewNumbers = [...new Set(trips.map(t => t.crew_number).filter(Boolean))].sort();

  return (
    <div ref={containerRef} className="overflow-y-auto h-full">
      {pullDistance > 0 && (
        <div className="flex justify-center py-2 text-muted-foreground" style={{ height: Math.min(pullDistance * 0.5, 40) }}>
          <RefreshCw className={`w-4 h-4 ${pulling ? 'text-primary animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 2}deg)` }} />
        </div>
      )}
      <PageHeader
        title={partner ? `Выезды — ${partner}` : 'Журнал выездов'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => exportSummaryToExcel(filteredTrips)}
              disabled={filteredTrips.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Сводный
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate('/trips/new')}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Новый
            </Button>
          </div>
        }
      />

      <div className="px-4 pt-3 pb-2 space-y-2">
        <MobileSelect
          value={crewFilter}
          onValueChange={setCrewFilter}
          placeholder="Все бригады"
          triggerClassName="h-8 text-xs"
          options={[
            { value: 'all', label: 'Все бригады' },
            ...crewNumbers.map(num => ({ value: num, label: `Бригада №${num}` })),
          ]}
        />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
            placeholder="Поиск по ФИО сотрудника..."
            className="h-8 text-xs pl-8 pr-8"
          />
          {employeeFilter && (
            <button onClick={() => setEmployeeFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-8 text-xs"
              placeholder="С"
            />
          </div>
          <div className="flex-1">
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-8 text-xs"
              placeholder="По"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-muted-foreground hover:text-foreground px-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm mb-3">Выездов пока нет</p>
            <Button size="sm" onClick={() => navigate('/trips/new')}>
              <Plus className="w-4 h-4 mr-1" /> Создать выезд
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrips.map(trip => (
              <Card
                key={trip.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/trips/${trip.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm">Бригада №{trip.crew_number}</h3>
                  <StatusBadge statusMap={tripStatuses} status={trip.status} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {trip.trip_date ? format(new Date(trip.trip_date), 'd MMMM yyyy', { locale: ru }) : '—'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {trip.employee_name || '—'}
                  </div>
                  {trip.field_name && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {trip.field_name}
                    </div>
                  )}
                  {trip.work_type && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Briefcase className="w-3 h-3" />
                      {workTypeLabels[trip.work_type] || trip.work_type}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}