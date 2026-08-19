import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

const ALL_PARTNERS = ['ИНК-Сервис', 'ИНК-ТКРС', 'Газпром Бурение', 'МУБР'];
const STORAGE_KEY = 'selected_partner';
const PartnerContext = createContext(null);

export function PartnerProvider({ children }) {
  const { user } = useAuth();
  const [partner, setPartnerState] = useState(() => localStorage.getItem(STORAGE_KEY) || null);

  const PARTNERS = (() => {
    if (!user) return ALL_PARTNERS;
    if (user.role === 'admin') return ALL_PARTNERS;
    const allowed = Array.isArray(user.allowed_partners) ? user.allowed_partners : [];
    return ALL_PARTNERS.filter(p => allowed.includes(p));
  })();

  // Если сохранённый партнёр больше не доступен пользователю — сбрасываем выбор
  useEffect(() => {
    if (partner && !PARTNERS.includes(partner)) {
      localStorage.removeItem(STORAGE_KEY);
      setPartnerState(null);
    }
  }, [user, partner]);

  const setPartner = (p) => {
    localStorage.setItem(STORAGE_KEY, p);
    setPartnerState(p);
  };
  const clearPartner = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPartnerState(null);
  };

  return (
    <PartnerContext.Provider value={{ partner, setPartner, clearPartner, PARTNERS }}>
      {children}
    </PartnerContext.Provider>
  );
}

export function usePartner() {
  return useContext(PartnerContext);
}
