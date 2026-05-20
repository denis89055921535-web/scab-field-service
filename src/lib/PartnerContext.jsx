import { createContext, useContext, useState, useEffect } from 'react';

const PARTNERS = ['ИНК', 'Газпром Бурение', 'МУБР'];
const STORAGE_KEY = 'selected_partner';

const PartnerContext = createContext(null);

export function PartnerProvider({ children }) {
  const [partner, setPartnerState] = useState(() => localStorage.getItem(STORAGE_KEY) || null);

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