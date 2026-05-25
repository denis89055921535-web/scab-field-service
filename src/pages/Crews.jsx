import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CrewCard from '@/components/crews/CrewCard';
import PageHeader from '@/components/common/PageHeader';
import { crewStatuses } from '@/lib/statusConfig';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function Crews({ partner }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: crews = [], isLoading } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list('crew_number'),
  });

  const { containerRef, pullDistance, pulling } = usePullToRefresh(() =>
    queryClient.invalidateQueries({ queryKey: ['crews'] })
  );

  const filtered = crews.filter(c => {
    const matchSearch = !search || 
      c.crew_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.field_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchPartner = !partner || c.partner === partner;
    return matchSearch && matchStatus && matchPartner;
  });

  return (
    <div ref={containerRef} className="overflow-y-auto h-full">
      {pullDistance > 0 && (
        <div className="flex justify-center py-2 text-muted-foreground" style={{ height: Math.min(pullDistance * 0.5, 40) }}>
          <RefreshCw className={`w-4 h-4 transition-transform ${pulling ? 'text-primary animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 2}deg)` }} />
        </div>
      )}
      <PageHeader
        title={partner ? `Бригады — ${partner}` : 'Буровые бригады'}
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        }
      />

      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру или месторождению..."
            className="pl-9 h-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearch('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {showFilters && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(crewStatuses).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Ничего не найдено
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(crew => (
              <CrewCard
                key={crew.id}
                crew={crew}
                onClick={() => navigate(`/crew/${crew.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}