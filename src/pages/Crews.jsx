import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CrewCard from '@/components/crews/CrewCard';
import PageHeader from '@/components/common/PageHeader';
import { crewStatuses } from '@/lib/statusConfig';

export default function Crews() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: crews = [], isLoading } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list('-created_date'),
  });

  const filtered = crews.filter(c => {
    const matchSearch = !search || 
      c.crew_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.field_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Буровые бригады"
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