import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/home-energy-analysis/',
  plugins: [react(), tailwindcss()],
})
