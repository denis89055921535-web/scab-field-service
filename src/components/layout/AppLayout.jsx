import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import TabKeepAlive from './TabKeepAlive';
import PartnerSelect from './PartnerSelect';

const TAB_PATHS = ['/', '/trips', '/warehouse', '/incidents', '/profile'];

export default function AppLayout() {
  const location = useLocation();
  const isTabRoute = TAB_PATHS.includes(location.pathname);
  const [partner, setPartner] = useState(() => localStorage.getItem('selected_partner') || null);

  const handlePartnerSelect = (p) => {
    localStorage.setItem('selected_partner', p);
    setPartner(p);
  };

  useEffect(() => {
    document.body.style.overflow = isTabRoute ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isTabRoute]);

  if (!partner) {
    return <PartnerSelect onSelect={handlePartnerSelect} />;
  }

  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="text-white px-4 py-2 flex items-center justify-between pl-2 bg-[#133371] safe-area-top">
        <img
          src="https://media.base44.com/images/public/69fc64a1b3cf2f52f788409b/675c8f4d4_ChatGPTImage7202614_48_13-fotor-bg-remover-2026050714553.png"
          alt="SCAB"
          className="h-10 object-contain"
        />
        <button
          onClick={() => { localStorage.removeItem('selected_partner'); setPartner(null); }}
          className="text-xs text-white/70 hover:text-white px-2 py-1 rounded"
        >
          {partner} ✕
        </button>
      </header>

      <main className="relative pb-24 max-w-lg mx-auto overflow-x-hidden min-h-screen">
        {/* Keep all tab pages mounted; toggle visibility for instant tab switching */}
        <TabKeepAlive partner={partner} />

        {/* Sub-routes (TripForm, CrewView) slide in from the right on top */}
        <AnimatePresence mode="wait" initial={false}>
          {!isTabRoute && (
            <motion.div
              key={location.pathname}
              className="fixed inset-0 bg-background z-20 overflow-y-auto"
              style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
              <Outlet />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}