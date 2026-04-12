import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure NODE_ENV is set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }

  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV 
    });
  });

  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "preview") {
    const distPath = path.resolve(__dirname, "dist");
    console.log(`[Production] Serving static files from: ${distPath}`);

    if (!fs.existsSync(distPath)) {
      console.error(`[Error] Dist directory not found at: ${distPath}`);
    }

    // Serve static files
    app.use(express.static(distPath));

    // SPA fallback
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend build not found. Please run 'npm run build'.");
      }
    });
  } else {
    console.log("[Development] Initializing Vite middleware...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (error) {
      console.error("[Error] Failed to load Vite:", error);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});
