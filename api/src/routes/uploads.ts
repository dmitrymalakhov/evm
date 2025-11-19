import { Router } from "express";
import fs from "fs";

import { getRequestUser } from "../utils/get-request-user";
import { upload, getFileUrl } from "../utils/upload";

const router = Router();

// Upload multiple files
router.post("/", upload.array("photos", 10), (request, response) => {
  try {
    const user = getRequestUser(request, true);
    if (!user) {
      return response.status(401).json({ message: "Пользователь не авторизован" });
    }

    const files = request.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.log("🔴 [UPLOAD] No files received");
      return response.status(400).json({ message: "Файлы не загружены" });
    }

    console.log("🔵 [UPLOAD] Received files:", {
      count: files.length,
      files: files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
        path: f.path,
        destination: f.destination,
      })),
    });

    const fileUrls = files.map((file) => {
      const fileUrl = getFileUrl(file.filename);
      console.log("🔵 [UPLOAD] Processing file:", {
        filename: file.filename,
        originalName: file.originalname,
        url: fileUrl,
        path: file.path,
        size: file.size,
        exists: fs.existsSync(file.path),
      });
      return {
        filename: file.filename,
        originalName: file.originalname,
        url: fileUrl,
        size: file.size,
        mimetype: file.mimetype,
      };
    });

    console.log("🟢 [UPLOAD] Returning file URLs:", fileUrls);

    return response.json({
      files: fileUrls,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return response.status(401).json({ message: error.message });
    }

    if (error instanceof Error && error.message.includes("Invalid file type")) {
      return response.status(400).json({ message: error.message });
    }

    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить файлы",
    });
  }
});

export default router;

