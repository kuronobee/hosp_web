import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/hospitalization/web/', // または実際のベースパス。例: '/hospital-app/'
  build: {
    sourcemap: true, // エラーのデバッグに便利
  },
});