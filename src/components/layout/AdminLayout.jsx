import { Outlet, Link, useLocation } from 'react-router-dom';
import { HardHat, ClipboardList, BookOpen, Users, ChevronLeft, Shield, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
  { path: '/admin', icon: HardHat, label: 'Буровые бригады', exact: true },
  { path: '/admin/trips', icon: ClipboardList, label: 'Журнал выездов' },
  { path: '/admin/warehouse', icon: Warehouse, label: 'Склад' },
  { path: '/admin/instructions', icon: BookOpen, label: 'Инструкции' },
  { path: '/admin/users', icon: Users, label: 'Пользователи' },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="bg-primary text-primary-foreground px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-semibold text-sm">Админ-панель АРБИ</span>
          </div>
          <Link to="/" className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-4 h-4" />
            В приложение
          </Link>
        </div>
      </header>

      <nav className="bg-card border-b border-border overflow-x-auto">
        <div className="max-w-5xl mx-auto flex">
          {adminLinks.map(({ path, icon: Icon, label, exact }) => {
            const isActive = exact 
              ? location.pathname === path 
              : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}