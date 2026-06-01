import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Lee VITE_API_URL del .env para derivar el origen del back (sin el sufijo
  // /api). Sirve para proxiar `/images/*` en dev al backend, replicando lo
  // que hace NPM en prod (Custom Location /images → backend:3000).
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL ?? "http://localhost:3000/api";
  let backendOrigin = "http://localhost:3000";
  try {
    backendOrigin = new URL(apiUrl).origin;
  } catch {
    // mantener default
  }

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      proxy: {
        // En dev el back corre en otro puerto. Proxiamos `/images/*` al back
        // así los `<img src="/images/...">` que vienen del API funcionan sin
        // hacer hardcodes del origen en el código del front. En prod NPM se
        // encarga de la misma ruta vía Custom Location.
        "/images": {
          target: backendOrigin,
          changeOrigin: true,
        },
        "/audio": {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
