import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  // Proxy setup for development mode
  server: {
    proxy: {
      // Proxy API requests to the backend
      "/api": {
        target: "http://localhost:3000/api", // Your backend server address
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""), // Remove /api prefix
      },
    },
  },

  // Build configuration for Vite
  build: {
    target: "esnext", // Ensures it targets browsers that support top-level await
    rollupOptions: {
      input: {
        // Define all the HTML pages you want to bundle
        main: resolve(__dirname, "./index.html"),
        signInSignUp: resolve(__dirname, "./signInSignUp.html"),
        index2: resolve(__dirname, "./index2.html"),
        heapSort: resolve(__dirname, "./heapsort.html"),
        kruskal: resolve(__dirname, "./Kruskal.html"),
        mainDungeon: resolve(__dirname, "./mainDungeon.html"),
        prim: resolve(__dirname, "./Prim.html"),
        // Add more HTML files as needed
      },
    },
  },
});
