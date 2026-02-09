import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  // TAMBAHKAN BLOK DEFINE INI:
  define: {
    'process.env': {},
    'React': 'React', 
  },
  // Blok preview ini boleh tetap ada, tapi tidak berpengaruh ke 'npx serve'
  preview: {
    host: true,
    port: 3000,
    allowedHosts: [
      'vendnage-vending-frontend.djujco.easypanel.host'
    ]
  }
})