import { Router } from "express";

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
      return response.status(400).json({ message: "Файлы не загружены" });
    }

    const fileUrls = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      url: getFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    }));

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

