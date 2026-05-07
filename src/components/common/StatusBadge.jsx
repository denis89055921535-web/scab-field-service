import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function StatusBadge({ statusMap, status }) {
  const config = statusMap[status];
  if (!config) return null;
  
  return (
    <Badge variant="outline" className={cn('font-medium border text-xs', config.color)}>
      {config.label}
    </Badge>
  );
}