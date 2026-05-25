import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Wifi, WifiOff, ChevronRight } from 'lucide-react';
import { crewStatuses } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';

export default function CrewCard({ crew, onClick }) {
  const status = crewStatuses[crew.status] || crewStatuses.inactive;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex gap-3 p-3">
        {crew.photo_url ? (
          <img
            src={crew.photo_url}
            alt={`БУ ${crew.crew_number}`}
            className="w-20 h-20 rounded-lg object-cover bg-muted flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-muted-foreground">
              {crew.crew_number}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight">
              Бригада №{crew.crew_number}
            </h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          </div>

          {crew.field_name && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {crew.field_name}
            </p>
          )}


          {crew.drill_type && (
            <p className="text-xs text-muted-foreground truncate">
              Тип БУ: {crew.drill_type}
            </p>
          )}

          {crew.partner && (
            <p className="text-xs text-primary font-medium truncate">
              Партнёр: {crew.partner}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0 font-medium border', status.color)}
            >
              {status.label}
            </Badge>
            {crew.has_no_internet ? (
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Нет интернета</span>
              </span>
            ) : (crew.has_wifi || crew.has_lte || crew.has_satellite) && (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">
                  {[crew.has_wifi && 'Wi-Fi', crew.has_lte && 'LTE', crew.has_satellite && 'Спутник'].filter(Boolean).join(' · ')}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}