import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const nativeBuild = process.env.CAPACITOR_BUILD === 'true';

export default defineConfig({
  plugins: [react()],
  base: nativeBuild ? './' : '/VELTRO-PRO/',
});
