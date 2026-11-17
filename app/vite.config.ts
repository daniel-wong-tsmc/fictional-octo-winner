import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works at any sub-path, such as
  // https://<owner>.github.io/fictional-octo-winner/. Pages use #hash routes, so no server rewrites are needed.
  base: './',
})
