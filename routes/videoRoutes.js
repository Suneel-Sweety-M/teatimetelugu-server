import express from "express";
import {
  addVideo,
  deleteVideo,
  getFilteredVideos,
} from "../controllers/videoController.js";

const router = express.Router();

router.get("/query", getFilteredVideos);
router.post("/add", addVideo);
router.delete("/:id", deleteVideo);

export default router;
