import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false
            }
        }
    },
    build: {
        // Ensure the build outputs to a predictable location
        outDir: 'dist',
        // Generate sourcemaps for easier debugging
        sourcemap: true,
        // Ensure the base URL is set correctly for hosting
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    icons: ['lucide-react']
                }
            }
        }
    }
})