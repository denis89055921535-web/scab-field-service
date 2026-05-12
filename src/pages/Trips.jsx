import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, MapPin, User, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { tripStatuses } from '@/lib/statusConfig';

const workTypeLabels = {
  maintenance: 'Обслуживание оборуд.',
  bi_accident: 'Авария БИ',
  bi_inspection: 'Инспекция БИ',
  equipment_install: 'Монтаж оборуд.',
  equipment_uninstall: 'Демонтаж оборуд.',
};

export default function Trips() {
  const navigate = useNavigate();
  const [crewFilter, setCrewFilter] = useState('all');

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => base44.entities.TripLog.list('-trip_date'),
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list(),
  });

  const filteredTrips = crewFilter === 'all'
    ? trips
    : trips.filter(t => t.crew_number === crewFilter);

  // Get unique crew numbers from trips for filter options
  const crewNumbers = [...new Set(trips.map(t => t.crew_number).filter(Boolean))].sort();

  return (
    <div>
      <PageHeader
        title="Журнал выездов"
        actions={
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => navigate('/trips/new')}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Новый
          </Button>
        }
      />

      <div className="px-4 pt-3 pb-2">
        <Select value={crewFilter} onValueChange={setCrewFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Все бригады" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все бригады</SelectItem>
            {crewNumbers.map(num => (
              <SelectItem key={num} value={num}>Бригада №{num}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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