import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/common/PageHeader';
import CrewDetail from '@/components/crews/CrewDetail';

export default function CrewView() {
  const params = new URLSearchParams(window.location.search);
  const crewId = window.location.pathname.split('/crew/')[1];

  const { data: crew, isLoading } = useQuery({
    queryKey: ['crew', crewId],
    queryFn: async () => {
      const crews = await base44.entities.DrillingCrew.filter({ id: crewId });
      return crews[0];
    },
    enabled: !!crewId,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Загрузка..." backTo="/" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!crew) {
    return (
      <div>
        <PageHeader title="Не найдена" backTo="/" />
        <div className="p-4 text-center text-muted-foreground">Бригада не найдена</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Бригада №${crew.crew_number}`} backTo="/" />
      <div className="p-4">
        <CrewDetail crew={crew} />
      </div>
    </div>
  );
}