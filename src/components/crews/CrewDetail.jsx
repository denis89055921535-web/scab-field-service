import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, MapPin, Cpu, Box, Layers, ChevronDown, Calendar, User, Briefcase, ChevronRight } from 'lucide-react';
import { crewStatuses, tripStatuses } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import StatusBadge from '@/components/common/StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const workTypeLabels = {
  maintenance: 'Обслуживание',
  bi_accident: 'Авария БИ',
  bi_inspection: 'Инспекция БИ',
  equipment_install: 'Монтаж',
  equipment_uninstall: 'Демонтаж',
};

export default function CrewDetail({ crew, onStatusChange, tripHistory = [] }) {
  const navigate = useNavigate();
  const status = crewStatuses[crew.status] || crewStatuses.moving;

  return (
    <div className="space-y-4">
      {crew.photo_url ? (
        <img
          src={crew.photo_url}
          alt={`БУ ${crew.crew_number}`}
          className="w-full h-48 object-cover rounded-xl"
        />
      ) : (
        <div className="w-full h-48 bg-muted rounded-xl flex items-center justify-center">
          <span className="text-5xl font-bold text-muted-foreground">{crew.crew_number}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Бригада №{crew.crew_number}</h2>
        {onStatusChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border', status.color)}>
                {status.label}
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(crewStatuses).map(([key, cfg]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className={cn('text-xs', crew.status === key && 'font-semibold')}
                >
                  {cfg.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge variant="outline" className={cn('font-medium border', status.color)}>
            {status.label}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <InfoRow icon={MapPin} label="Месторождение" value={crew.field_name || '—'} />
          <InfoRow icon={MapPin} label="Наименование проекта" value={crew.project_name || '—'} />
          <InfoRow icon={Box} label="Тип БУ" value={crew.drill_type || '—'} />
          <InfoRow icon={Layers} label="Комплекты БИ" value={crew.bi_kits_numbers || '—'} />
          <InfoRow 
            icon={crew.has_internet ? Wifi : WifiOff} 
            label="Интернет" 
            value={crew.has_internet ? 'Есть' : 'Нет'} 
          />
          <InfoRow icon={Cpu} label="Тип модуля" value={crew.module_type || '—'} />
          <InfoRow icon={Box} label="Тип шкафов" value={crew.cabinet_type || '—'} />
        </CardContent>
      </Card>

      {/* Trip history */}
      <div>
        <h3 className="text-sm font-semibold mb-2">История выездов ({tripHistory.length})</h3>
        {tripHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Выездов по данной бригаде нет</p>
        ) : (
          <div className="space-y-2">
            {tripHistory.map(trip => (
              <Card
                key={trip.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/trips/${trip.id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {trip.trip_date ? format(new Date(trip.trip_date), 'd MMM yyyy', { locale: ru }) : '—'}
                    </div>
                    <StatusBadge statusMap={tripStatuses} status={trip.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    <User className="w-3 h-3" />
                    {trip.employee_name || '—'}
                  </div>
                  {trip.work_type && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Briefcase className="w-3 h-3" />
                      {workTypeLabels[trip.work_type] || trip.work_type}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}