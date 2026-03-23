import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY1': JSON.stringify(process.env.GEMINI_API_KEY1 || env.GEMINI_API_KEY1 || ''),
      'process.env.Gemini_API_Key2': JSON.stringify((process.env as any).Gemini_API_Key2 || env.Gemini_API_Key2 || ''),
      'process.env.Gemini_API_Key3': JSON.stringify((process.env as any).Gemini_API_Key3 || env.Gemini_API_Key3 || ''),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
