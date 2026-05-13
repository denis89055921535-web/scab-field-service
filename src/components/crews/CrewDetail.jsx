import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, MapPin, Cpu, Box, Layers } from 'lucide-react';
import { crewStatuses } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';

export default function CrewDetail({ crew }) {
  const status = crewStatuses[crew.status] || crewStatuses.inactive;

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
        <Badge variant="outline" className={cn('font-medium border', status.color)}>
          {status.label}
        </Badge>
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