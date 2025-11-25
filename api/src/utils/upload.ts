import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads/tasks");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("🔵 [MULTER] Destination called:", {
      uploadsDir,
      exists: fs.existsSync(uploadsDir),
      fileOriginalName: file.originalname,
    });
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("🟢 [MULTER] Created uploads directory:", uploadsDir);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    // Remove spaces and special characters from filename to avoid URL encoding issues
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9\-_]/g, "") // Remove special characters except hyphens and underscores
      .substring(0, 50); // Limit length
    const filename = `${basename}-${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    console.log("🔵 [MULTER] Filename generated:", {
      originalName: file.originalname,
      filename,
      fullPath: filePath,
    });
    cb(null, filename);
  },
});

// File filter - only allow images
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed."));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// Get file URL from file path
export function getFileUrl(filename: string): string {
  return `/uploads/tasks/${filename}`;
}

// Get file path from filename
export function getFilePath(filename: string): string {
  return path.join(uploadsDir, filename);
}

// Delete file
export function deleteFile(filename: string): void {
  const filePath = getFilePath(filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

