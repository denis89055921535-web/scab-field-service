import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Calendar, ChevronRight, PackageOpen, Plus, ShoppingCart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/common/PageHeader';
import MobileSelect from '@/components/common/MobileSelect';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { outboxGetAll } from '@/lib/offlineDb';
import { usePartner } from '@/lib/PartnerContext';
import {
  formatRequestDate,
  formatRequestLocation,
  requestStatusConfig,
  requestTypeConfig,
} from '@/lib/warehouseRequests';

const statusOptions = [
  { value: 'all', label: 'Все статусы' },
  ...Object.entries(requestStatusConfig).map(([value, config]) => ({ value, label: config.label })),
];

export default function WarehouseRequests() {
  const navigate = useNavigate();
  const { partner } = usePartner();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['equipment-requests', partner],
    queryFn: () => partner
      ? base44.entities.EquipmentRequest.filter({ partner })
      : base44.entities.EquipmentRequest.list(),
  });

  const { data: localRequests = [] } = useQuery({
    queryKey: ['localEquipmentRequests'],
    queryFn: async () => {
      const records = await outboxGetAll();
      return records
        .filter(record => record.endpoint === '/equipment-requests')
        .map(record => ({ ...record.data, _local: true, _localId: record.localId }));
    },
    refetchInterval: 3000,
  });

  const localIds = new Set(localRequests.map(request => String(request.id)));
  const allRequests = [
    ...localRequests,
    ...requests.filter(request => !localIds.has(String(request.id))),
  ];

  const filtered = allRequests.filter(request => {
    if (partner && request.partner && request.partner !== partner) return false;
    return statusFilter === 'all' || request.status === statusFilter;
  });

  return (
    <div className="min-h-full bg-background pb-8">
      <PageHeader
        title="Мои заявки"
        onBack={() => navigate('/warehouse')}
        actions={
          <Button size="sm" onClick={() => navigate('/warehouse/requests/new/movement')}>
            <Plus className="w-4 h-4 mr-1" /> Новая
          </Button>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {import.meta.env.DEV && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            Локальный режим: заявки хранятся только в этом браузере и не отправляются в рабочую БД.
          </div>
        )}
        <MobileSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Все статусы"
          options={statusOptions}
          triggerClassName="h-10"
        />

        {isLoading && localRequests.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(item => <Skeleton key={item} className="h-28 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <PackageOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Заявок пока нет</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button onClick={() => navigate('/warehouse/requests/new/movement')}>Создать перемещение</Button>
              <Button variant="outline" onClick={() => navigate('/warehouse/requests/new/purchase')}>Запросить приобретение</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(request => (
              <RequestCard
                key={request.id || request._localId}
                request={request}
                onOpen={() => navigate(`/warehouse/requests/${request.request_type}/${request.id || request._localId}/edit`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request, onOpen }) {
  const isMovement = request.request_type === 'movement';
  const Icon = isMovement ? ArrowLeftRight : ShoppingCart;
  const status = requestStatusConfig[request.status] || requestStatusConfig.draft;
  const title = isMovement
    ? request.asset_name || requestTypeConfig.movement.fullLabel
    : request.items?.[0]?.name || requestTypeConfig.purchase.fullLabel;
  const subtitle = isMovement
    ? `${formatRequestLocation(request.source_location_type, request.source_crew_number)} → ${formatRequestLocation(request.destination_type, request.destination_crew_number)}`
    : `${request.items?.length || 0} поз. · ${formatRequestLocation(request.destination_type, request.destination_crew_number)}`;

  return (
    <Card
      className="p-4 cursor-pointer transition-colors hover:bg-muted/40 active:bg-muted/60"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onOpen();
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMovement ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">{requestTypeConfig[request.request_type]?.label || 'Заявка'}</div>
              <h3 className="font-semibold text-sm mt-0.5 line-clamp-2">{title}</h3>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${status.className}`}>
              {request._local || request._localPreview ? `${status.label} · локально` : status.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatRequestDate(request.created_at || request.created_date || request.desired_date)}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Card>
  );
}
