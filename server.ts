import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure NODE_ENV is set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }

  console.log(`[Startup] Starting server on port ${PORT}`);
  console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[Startup] Current working directory: ${process.cwd()}`);

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
    // In production, we serve from the dist folder.
    // We try multiple ways to find it to be as robust as possible.
    const possiblePaths = [
      path.join(process.cwd(), "dist"),
      path.join(process.cwd()),
      path.resolve("dist"),
      path.resolve(".")
    ];

    let distPath = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, "index.html"))) {
        distPath = p;
        break;
      }
    }

    if (!distPath) {
      distPath = path.join(process.cwd(), "dist");
      console.error(`[Error] Could not find index.html in any of: ${possiblePaths.join(", ")}`);
    }
    
    console.log(`[Production] Serving static files from: ${distPath}`);

    // Serve static files
    app.use(express.static(distPath));

    // SPA fallback
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`Frontend build not found. Searched in: ${distPath}`);
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

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Unhandled Error]", err);
    res.status(500).send("Internal Server Error");
  });
}

startServer().catch((err) => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});
