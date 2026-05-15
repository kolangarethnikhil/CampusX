import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: 'injectManifest',
      injectManifest: {
        swSrc: 'src/firebase-sw.js',
        swDest: 'sw.js',
      },
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "og-image.png"],
      manifest: {
  name: "CampusX",
  short_name: "CampusX",
  description:
    "Find rooms near KJU on a map, see travel distance from campus, and ping verified posters safely.",
  theme_color: "#0B0B0F",
  background_color: "#0B0B0F",
  display: "standalone",
  orientation: "portrait",
  lang: "en-IN",
  start_url: "/",
  scope: "/",
  categories: ["education", "shopping", "utilities"],
  icons: [
    {
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable any",
    },
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable any",
    },
  ],
}
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== "true",
  },
});