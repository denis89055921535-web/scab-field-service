import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="bg-primary text-primary-foreground px-4 py-3 text-center">
        <span className="text-xl font-bold tracking-widest">SKAB</span>
      </header>
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}