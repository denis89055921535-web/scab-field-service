import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="bg-[#1a3a6b] text-white px-4 py-2 flex items-center justify-center">
        <img src="https://media.base44.com/images/public/69fc64a1b3cf2f52f788409b/3475448f0_62487d37-7f90-4b40-b584-5a3445e0d554.png" alt="SCAB" className="h-10 object-contain" />
      </header>
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}