import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { AnimatePresence, motion } from 'framer-motion';

export default function AppLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="text-white px-4 py-2 flex items-center justify-start pl-2 bg-[#133371] safe-area-top">
        <img src="https://media.base44.com/images/public/69fc64a1b3cf2f52f788409b/675c8f4d4_ChatGPTImage7202614_48_13-fotor-bg-remover-2026050714553.png" alt="SCAB" className="h-10 object-contain" />
      </header>
      <main className="pb-24 max-w-lg mx-auto overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>);

}