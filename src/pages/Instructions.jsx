import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ChevronRight, FolderOpen } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

export default function Instructions() {
  const [activeCategory, setActiveCategory] = useState(null);

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['instruction-categories'],
    queryFn: () => base44.entities.InstructionCategory.list(),
  });

  const { data: instructions = [], isLoading: instLoading } = useQuery({
    queryKey: ['instructions'],
    queryFn: () => base44.entities.Instruction.list(),
  });

  const isLoading = catLoading || instLoading;
  const countFor = (catId) => instructions.filter(i => i.category_id === catId).length;
  const currentCategory = categories.find(c => c.id === activeCategory);
  const currentFiles = instructions.filter(i => i.category_id === activeCategory);

  return (
    <div className="pb-24">
      <PageHeader
        title={activeCategory ? currentCategory?.name || 'Инструкции' : 'Инструкции'}
        onBack={activeCategory ? () => setActiveCategory(null) : undefined}
      />

      <div className="px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !activeCategory ? (
          categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Разделы инструкций пока не добавлены
            </div>
          ) : (
            categories.map(cat => (
              <Card
                key={cat.id}
                className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setActiveCategory(cat.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{countFor(cat.id)} файлов</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Card>
            ))
          )
        ) : currentFiles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            В этом разделе пока нет файлов
          </div>
        ) : (
          currentFiles.map(file => (
            <a
              key={file.id}
              href={file.file_url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <Card className="p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{file.title}</p>
                  <p className="text-xs text-muted-foreground">{file.file_name || 'PDF файл'}</p>
                </div>
              </Card>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
