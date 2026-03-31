import express from "express";
import * as path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import * as fs from "fs";

console.log("Imports successful");
console.log("Environment:", process.env.NODE_ENV);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    console.log("Initializing server...");
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      console.log("Starting in development mode");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Starting in production mode");
      const distPath = path.join(process.cwd(), "dist");
      console.log("Serving static files from:", distPath);
      
      if (!fs.existsSync(distPath)) {
        console.error("Dist directory does not exist:", distPath);
        process.exit(1);
      }
      
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
