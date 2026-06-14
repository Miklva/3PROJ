import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.supcontent.app',
  appName: 'Supcontent',
  webDir: 'dist',
  server: {
    androidScheme: "http",
    allowNavigation: ['10.0.2.2', '10.0.2.2:5000']
  },
};

export default config;
