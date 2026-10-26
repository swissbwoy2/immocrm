import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";


// https://vitejs.dev/config/
/**
 * Garde de démarrage injecté dans index.html : si l'app ne démarre pas (fichiers d'une ancienne version
 * introuvables après une publication), on retire le service worker et ses caches puis on recharge une seule fois.
 */
const BOOT_GUARD = `(function(){var K='__boot_recover';function recover(why){try{if(sessionStorage.getItem(K))return;sessionStorage.setItem(K,why||'1');}catch(e){return;}var done=function(){location.reload();};try{var p=[];if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister();}));}));}if(window.caches&&caches.keys){p.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k);}));}));}Promise.all(p).then(done,done);setTimeout(done,3000);}catch(e){done();}}window.addEventListener('error',function(e){var t=e&&e.target;if(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK')){var u=t.src||t.href||'';if(u.indexOf('/assets/')>-1)recover('asset');}},true);setTimeout(function(){if(!window.__APP_BOOTED)recover('timeout');},15000);window.addEventListener('load',function(){setTimeout(function(){try{if(window.__APP_BOOTED)sessionStorage.removeItem(K);}catch(e){}},20000);});})();`;

const bootGuardPlugin = () => ({
  name: 'logisorama-boot-guard',
  transformIndexHtml(html: string) {
    return html.replace('<head>', `<head>\n    <script>${BOOT_GUARD}</script>`);
  },
});

export default defineConfig(({ mode }) => {
  // Ensure critical backend env vars are always available at runtime.
  // (Vite only injects import.meta.env at dev-server start / build time.)
  const env = loadEnv(mode, process.cwd(), "");

  const supabaseUrl =
    env.VITE_SUPABASE_URL || "https://ydljsdscdnqrqnjvqela.supabase.co";
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbGpzZHNjZG5xcnFuanZxZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTU4OTgsImV4cCI6MjA3OTIzMTg5OH0.nvVdojYaSO8b8d-Qua4eSnyz_h-n-2TbcdJLk8v0E5E";
  const supabaseProjectId = env.VITE_SUPABASE_PROJECT_ID || "ydljsdscdnqrqnjvqela";
  const appBuildId = new Date().toISOString();

  return {
    define: {
      "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(appBuildId),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      bootGuardPlugin(),
      mcpPlugin(),
      mode === "development" && componentTagger(),
      VitePWA({

        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "app-icon.png"],
        manifest: {
          name: "Logisorama by Immo-rama.ch",
          short_name: "Logisorama",
          description: "Votre assistant immobilier personnel",
          theme_color: "#2C9273",
          background_color: "#2C9273",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/app-icon.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/app-icon.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/app-icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          // Le HTML n'est jamais précaché : après une publication, l'ancien index.html pointait vers des
          // fichiers supprimés (page blanche, routes qui ne s'ouvrent plus). Les pages passent par le réseau d'abord.
          globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                // Sans délai d'abandon : la copie en cache ne sert que hors connexion.
                cacheName: "html-cache",
                expiration: { maxEntries: 10 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/\/node_modules\/(?:react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
            if (/\/node_modules\/@tanstack\/(?:react-query|query-core)\//.test(id)) return 'vendor-query';
            if (/\/node_modules\/framer-motion\//.test(id)) return 'vendor-motion';
            if (/\/node_modules\/(?:recharts|d3-[^/]+|victory-vendor)\//.test(id)) return 'vendor-charts';
            if (/\/node_modules\/date-fns\//.test(id)) return 'vendor-dates';
            if (/\/node_modules\/lucide-react\//.test(id)) return 'vendor-icons';
            if (/\/node_modules\/@supabase\//.test(id)) return 'vendor-cloud';
          },
        },
      },
    },
  };
});
