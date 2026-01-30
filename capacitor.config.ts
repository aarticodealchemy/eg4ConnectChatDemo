import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'eg4ConnectDemo',
  webDir: 'www',
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK'
    },
    EdgeToEdge: {
      backgroundColor: "#0d141a",
    }
  }
};

export default config;
