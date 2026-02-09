import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: true,
    port: 3000,
    allowedHosts: [
      'vendnage-vending-frontend.djujco.easypanel.host'
    ]
  }
})