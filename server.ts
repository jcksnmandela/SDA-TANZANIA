import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { fileURLToPath } from "url";

// Define __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Crucial: Default to production unless explicitly set to development
  // This prevents loading heavy Vite middleware in the production environment
  const isDev = process.env.NODE_ENV === "development";
  const mode = isDev ? "development" : "production";
  
  console.log(`[Startup] SDA Tanzania Server starting in ${mode} mode...`);
  console.log(`[Startup] Port: ${PORT}`);
  console.log(`[Startup] CWD: ${process.cwd()}`);

  app.use(cors());
  app.use(express.json());

  // Health check - critical for Cloud Run deployment
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      mode 
    });
  });

  if (!isDev) {
    // Production mode: serve static files from dist
    const distPath = path.resolve(process.cwd(), "dist");
    const indexPath = path.join(distPath, "index.html");

    console.log(`[Production] Serving static files from: ${distPath}`);
    
    if (fs.existsSync(indexPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      app.get("*", (req, res) => {
        res.status(404).send(`Frontend build not found. Checked: ${indexPath}`);
      });
    }
  } else {
    // Development mode: use Vite middleware
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
      app.get("*", (req, res) => {
        res.status(500).send("Failed to load development server");
      });
    }
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Runtime Error]", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});
