// routes/authRoutes.js
import { Router } from "express";
import multer from "multer";
import { userAuth } from "../middlewares/jwt.js";
import {
  addGallery,
  deleteGallery,
  editGallery,
  getFilteredGallery,
  getGalleryById,
} from "../controllers/galleryController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/filter", getFilteredGallery);
router.get("/:id", getGalleryById);

router.post("/add", userAuth, upload.array("mediaFiles"), addGallery);

router.put("/edit/:id", userAuth, upload.array("mediaFiles"), editGallery);

router.delete("/delete/:id", userAuth, deleteGallery);

export default router;
