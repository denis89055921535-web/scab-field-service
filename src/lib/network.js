import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

const API_URL = 'https://scabpro.com/api';

// Жёсткий таймаут: промис не может висеть дольше ms
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// Реальная проверка сети
export async function checkOnline() {
  // В APK — нативная проверка (надёжнее, чем navigator.onLine в WebView)
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await withTimeout(Network.getStatus(), 1500);
      if (status && status.connected === false) return false;
      // Сеть есть по мнению системы — подтверждаем пингом
      const ping = await withTimeout(
        fetch(`${API_URL}/health`, { method: 'GET', cache: 'no-store' })
          .then(r => r.ok)
          .catch(() => false),
        3000
      );
      return ping === true;
    } catch {
      return false;
    }
  }

  // Браузер
  if (!navigator.onLine) return false;
  const ping = await withTimeout(
    fetch(`${API_URL}/health`, { method: 'GET', cache: 'no-store' })
      .then(r => r.ok)
      .catch(() => false),
    3000
  );
  return ping === true;
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