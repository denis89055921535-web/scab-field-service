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
import StatusBadge from '@/components/common/StatusBadge';
import { tripStatuses, checklistItems } from '@/lib/statusConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTrips() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
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
      toast.success('Выезд удалён');
    },
  });

  const filtered = trips.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchSearch = !search || 
      t.crew_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.employee_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Журнал выездов</h2>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Поиск по бригаде или сотруднику..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(tripStatuses).map(([k, { label }]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
              {filtered.map(trip => (
                <TableRow key={trip.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(trip)}>
                  <TableCell className="text-sm">
                    {trip.trip_date ? format(new Date(trip.trip_date), 'd MMM yyyy', { locale: ru }) : '—'}
                  </TableCell>
                  <TableCell className="font-medium">№{trip.crew_number}</TableCell>
                  <TableCell>{trip.employee_name || '—'}</TableCell>
                  <TableCell>{trip.field_name || '—'}</TableCell>
                  <TableCell><StatusBadge statusMap={tripStatuses} status={trip.status} /></TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={e => { e.stopPropagation(); deleteMutation.mutate(trip.id); }}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Выезд — Бригада №{selected.crew_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Дата</p>
                    <p className="font-medium">{selected.trip_date ? format(new Date(selected.trip_date), 'd MMMM yyyy', { locale: ru }) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Статус</p>
                    <StatusBadge statusMap={tripStatuses} status={selected.status} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Сотрудник</p>
                    <p className="font-medium">{selected.employee_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Месторождение</p>
                    <p className="font-medium">{selected.field_name || '—'}</p>
                  </div>
                </div>
                {selected.reason && (
                  <div>
                    <p className="text-muted-foreground text-xs">Причина</p>
                    <p className="text-sm">{selected.reason}</p>
                  </div>
                )}
                {selected.checklist && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Чек-лист</p>
                    <div className="space-y-1.5">
                      {checklistItems.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          {selected.checklist[key]
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <Circle className="w-4 h-4 text-muted-foreground" />
                          }
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.comment && (
                  <div>
                    <p className="text-muted-foreground text-xs">Комментарий</p>
                    <p className="text-sm">{selected.comment}</p>
                  </div>
                )}
                {selected.photos?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Фотоотчёт</p>
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