import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import TabKeepAlive from './TabKeepAlive';
import PartnerSelect from './PartnerSelect';
import { ChevronDown } from 'lucide-react';
import { usePartner } from '@/lib/PartnerContext';

const TAB_PATHS = ['/', '/trips', '/warehouse', '/incidents', '/profile'];

export default function AppLayout() {
  const location = useLocation();
  const isTabRoute = TAB_PATHS.includes(location.pathname);
  const { partner, setPartner, PARTNERS } = usePartner();
  const [showSwitch, setShowSwitch] = useState(false);

  const handlePartnerSelect = (p) => {
    setPartner(p);
    setShowSwitch(false);
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
          onClick={() => setShowSwitch(true)}
          className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors px-3 py-2 rounded-lg font-semibold text-sm"
        >
          {partner}
          <ChevronDown className="w-4 h-4 opacity-80" />
        </button>
      </header>

      {showSwitch && (
        <div className="fixed inset-0 z-[100] flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSwitch(false)} />
          <div className="relative mt-auto bg-background rounded-t-2xl p-6 pb-10 space-y-4 safe-area-bottom max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-center">Сменить проект</h2>
            {PARTNERS.map(p => (
              <button
                key={p}
                onClick={() => handlePartnerSelect(p)}
                className={`w-full rounded-xl border-2 px-4 py-4 text-left font-semibold text-base transition-all ${
                  partner === p
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

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