import { Router } from "express";
import { upload } from "../../middlewares/uploadMiddleware.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

// Endpoint for uploading files: POST /api/upload
// Expects form-data field name to be 'file'
router.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { message: "No file uploaded" } });
  }

  // Generate file URL accessible from frontend
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  return res.json({
    success: true,
    file: {
      name: req.file.originalname,
      filename: req.file.filename,
      size: `${(req.file.size / 1024).toFixed(1)} KB`,
      url: fileUrl
    }
  });
});

export default router;
