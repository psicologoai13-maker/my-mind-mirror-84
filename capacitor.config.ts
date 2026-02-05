import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fbccba356c2d492785b7f5d9452ccaa4',
  appName: 'my-mind-mirror-84',
  webDir: 'dist',
  server: {
    url: 'https://fbccba35-6c2d-4927-85b7-f5d9452ccaa4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    backgroundColor: '#0D0D0F'
  }
};

export default config;