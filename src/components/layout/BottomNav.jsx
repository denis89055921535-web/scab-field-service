import { Link, useLocation } from 'react-router-dom';
import { HardHat, ClipboardList, BookOpen, User, Warehouse, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/', icon: HardHat, label: 'Буровые' },
  { path: '/trips', icon: ClipboardList, label: 'Журнал' },
  { path: '/warehouse', icon: Warehouse, label: 'Склад' },
  { path: '/incidents', icon: AlertTriangle, label: 'Аварии' },
  { path: '/profile', icon: User, label: 'Кабинет' },
];

export default function BottomNav() {
  const location = useLocation();

  // Hide bottom nav on trip form pages so action buttons are visible
  const isTripForm = location.pathname.startsWith('/trips/');
  if (isTripForm) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}