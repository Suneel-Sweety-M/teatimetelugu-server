// routes/authRoutes.js
import { Router } from "express";
import multer from "multer";
import { userAuth } from "../middlewares/jwt.js";
import {
  addNews,
  addReaction,
  deleteNews,
  editNews,
  getCategoryNews,
  getFilteredNews,
  getLatestNews,
  getNewsById,
  getNewsByNewsId,
  getTrendingNews,
} from "../controllers/newsController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/filter", getFilteredNews);
router.get("/category", getCategoryNews);
router.get("/latest", getLatestNews);
router.get("/trending", getTrendingNews);
router.get("/n/:newsId", getNewsByNewsId);
router.get("/:id", getNewsById);

router.post("/add", userAuth, upload.single("mainFile"), addNews);

router.put("/:newsId/add-reaction", userAuth, addReaction);
router.put("/edit/:id", userAuth, upload.single("mainFile"), editNews);

router.delete("/delete/:id", userAuth, deleteNews);

export default router;
