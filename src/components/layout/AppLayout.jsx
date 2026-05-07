import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="text-white px-4 py-2 flex items-center justify-center bg-[#133371]">
        <img src="https://media.base44.com/images/public/69fc64a1b3cf2f52f788409b/f04edf800_ChatGPTImage7202614_43_48.png" alt="SCAB" className="h-10 object-contain" />
      </header>
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>);

}