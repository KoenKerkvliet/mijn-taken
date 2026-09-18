import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Draait op GitHub Pages onder /mijn-taken/. Zodra er een eigen domein aan
// hangt wordt dit '/'.
export default defineConfig({
  plugins: [react()],
  base: '/mijn-taken/',
})
