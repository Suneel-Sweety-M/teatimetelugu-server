import express from "express";
import {
  addVideo,
  deleteVideo,
  getFilteredVideos,
  getVideoByNewsId,
} from "../controllers/videoController.js";
import { userAuth } from "../middlewares/jwt.js";

const router = express.Router();

router.get("/filter", getFilteredVideos);
router.get("/v/:newsId", getVideoByNewsId);
router.post("/add", userAuth, addVideo);
router.delete("/:id", userAuth, deleteVideo);

export default router;
