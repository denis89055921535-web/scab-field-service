import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FileText, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import PageHeader from '@/components/common/PageHeader';
import { categoryLabels } from '@/lib/statusConfig';

export default function Instructions() {
  const [search, setSearch] = useState('');

  const { data: instructions = [], isLoading } = useQuery({
    queryKey: ['instructions'],
    queryFn: () => base44.entities.Instruction.list('-created_date'),
  });

  const filtered = instructions.filter(i =>
    !search || i.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Инструкции" />

      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск инструкции..."
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

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Инструкций не найдено
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {item.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {categoryLabels[item.category] || item.category}
                        </Badge>
                      )}
                      {item.version && (
                        <span className="text-[10px] text-muted-foreground">v{item.version}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(item.updated_date || item.created_date), 'dd.MM.yyyy')}
                      </span>
                    </div>
                  </div>
                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
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