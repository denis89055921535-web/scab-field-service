import { useState, useEffect } from 'react';

const API_URL = 'https://scabpro.com/api';

// Реальная проверка сети через /api/health (navigator.onLine врёт при Wi-Fi без интернета)
export async function checkOnline() {
  if (!navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

// React-хук: следит за состоянием сети
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    let active = true;

    const update = async () => {
      const result = await checkOnline();
      if (active) setOnline(result);
    };

    // Реакция на события браузера
    const handleOnline = () => update();
    const handleOffline = () => { if (active) setOnline(false); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Периодическая проверка каждые 20 секунд
    const interval = setInterval(update, 20000);

    // Первичная проверка
    update();

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return online;
}