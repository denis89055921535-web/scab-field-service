import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PageHeader({ title, backTo, actions }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {backTo && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => navigate(backTo)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-lg font-bold truncate">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}