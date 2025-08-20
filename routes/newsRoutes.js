// routes/authRoutes.js
import { Router } from "express";
import multer from "multer";
import { userAuth } from "../middlewares/jwt.js";
import {
  addNews,
  deleteNews,
  editNews,
  getFilteredNews,
  getNewsById,
} from "../controllers/newsController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/filter", getFilteredNews);
router.get("/:id", getNewsById);

router.post("/add", userAuth, upload.single("mainFile"), addNews);

router.put("/edit/:id", userAuth, upload.single("mainFile"), editNews);

router.delete("/delete/:id", userAuth, deleteNews);

export default router;
