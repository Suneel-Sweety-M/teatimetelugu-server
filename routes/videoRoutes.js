import express from "express";
import {
  addVideo,
  deleteVideo,
  getFilteredVideos,
  getVideoByNewsId,
} from "../controllers/videoController.js";

const router = express.Router();

router.get("/filter", getFilteredVideos);
router.get("/v/:newsId", getVideoByNewsId);
router.post("/add", addVideo);
router.delete("/:id", deleteVideo);

export default router;
