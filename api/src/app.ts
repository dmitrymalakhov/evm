import cors from "cors";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // Serve static files from uploads directory
  const uploadsStaticPath = path.join(__dirname, "../uploads");
  console.log("🔵 [APP] Setting up static file serving:", {
    route: "/uploads",
    path: uploadsStaticPath,
    exists: fs.existsSync(uploadsStaticPath),
  });
  
  // Custom middleware to handle URLs with encoded spaces and CORS
  app.use("/uploads", (req, res, next) => {
    // Set CORS headers for all requests (including OPTIONS)
    const origin = req.headers.origin;
    // Allow requests from any origin for static files
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    // Handle OPTIONS preflight requests
    if (req.method === "OPTIONS") {
      console.log("🔵 [STATIC] OPTIONS request:", { origin, path: req.path });
      return res.status(200).end();
    }
    
    // Log the request for debugging
    console.log("🔵 [STATIC] Request for file:", {
      method: req.method,
      originalUrl: req.originalUrl,
      url: req.url,
      path: req.path,
      origin,
    });
    
    // Try to decode the path to handle files with spaces
    // If the file doesn't exist with encoded name, try with decoded name
    const decodedPath = decodeURIComponent(req.path);
    if (decodedPath !== req.path) {
      const decodedFilePath = path.join(uploadsStaticPath, decodedPath);
      const encodedFilePath = path.join(uploadsStaticPath, req.path);
      
      // Check if file exists with decoded path (original filename with spaces)
      if (fs.existsSync(decodedFilePath) && !fs.existsSync(encodedFilePath)) {
        console.log("🟡 [STATIC] File found with decoded path, serving:", {
          requested: req.path,
          decoded: decodedPath,
          fileExists: fs.existsSync(decodedFilePath),
        });
        // Set proper content type
        const ext = path.extname(decodedFilePath).toLowerCase();
        if (ext === ".jpg" || ext === ".jpeg") {
          res.setHeader("Content-Type", "image/jpeg");
        } else if (ext === ".png") {
          res.setHeader("Content-Type", "image/png");
        } else if (ext === ".gif") {
          res.setHeader("Content-Type", "image/gif");
        } else if (ext === ".webp") {
          res.setHeader("Content-Type", "image/webp");
        }
        // Serve the file directly
        return res.sendFile(decodedFilePath);
      }
    }
    
    next();
  });
  
  // Serve static files with proper options
  app.use("/uploads", express.static(uploadsStaticPath, {
    // Set proper headers for images
    setHeaders: (res, filePath) => {
      // CORS headers are already set by middleware above, but ensure they're there
      const origin = res.req?.headers.origin;
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      
      // Set proper content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".jpg" || ext === ".jpeg") {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (ext === ".png") {
        res.setHeader("Content-Type", "image/png");
      } else if (ext === ".gif") {
        res.setHeader("Content-Type", "image/gif");
      } else if (ext === ".webp") {
        res.setHeader("Content-Type", "image/webp");
      }
    },
  }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use(routes);

  app.use((_request, response) => {
    response.status(404).json({ message: "Маршрут не найден" });
  });

  return app;
}

