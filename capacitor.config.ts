import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scabpro.field',
  appName: 'SCAB Полевая служба',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;