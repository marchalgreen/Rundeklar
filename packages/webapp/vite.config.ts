import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import type { Plugin } from 'vite'

// Plugin to ensure CSP includes Supabase URLs
const cspPlugin = (): Plugin => {
  return {
    name: 'csp-supabase',
    transformIndexHtml(html) {
      // Ensure CSP includes Supabase URLs - check if it's missing and add it
      if (html.includes('connect-src') && !html.includes('https://*.supabase.co')) {
        return html.replace(
          /(connect-src[^"]*)/,
          "$1 https://*.supabase.co"
        )
      }
      return html
    }
  }
}

// Plugin to copy tenant config files to dist
const copyTenantConfigsPlugin = (): Plugin => {
  return {
    name: 'copy-tenant-configs',
    writeBundle() {
      const srcDir = resolve(__dirname, 'src/config/tenants')
      const destDir = resolve(__dirname, 'dist/config/tenants')
      
      try {
        // Create destination directory
        mkdirSync(destDir, { recursive: true })
        
        // Copy all JSON files from src/config/tenants to dist/config/tenants
        const files = readdirSync(srcDir)
        for (const file of files) {
          if (file.endsWith('.json')) {
            const srcPath = resolve(srcDir, file)
            const destPath = resolve(destDir, file)
            copyFileSync(srcPath, destPath)
            console.log(`✅ Copied tenant config: ${file}`)
          }
        }
      } catch (error) {
        console.warn('⚠️  Failed to copy tenant configs:', error)
      }
    }
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/HerlevHjorten/' : '/'),
  root: resolve(__dirname, '.'),
  plugins: [react(), cspPlugin(), copyTenantConfigsPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  preview: {
    host: '127.0.0.1',
    port: 4173
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
