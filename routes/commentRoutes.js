import express from "express";
import {
  addComment,
  addReplyComment,
  deleteComment,
  dislikeComment,
  getComments,
  likeComment,
} from "../controllers/commentController.js";
import { userAuth } from "../middlewares/jwt.js";
import { addReaction } from "../controllers/newsController.js";

const router = express.Router();

router.get("/:newsId", getComments);

router.post("/:newsId/add-comment", userAuth, addComment);
router.post("/:newsId/add-reply-comment", userAuth, addReplyComment);

router.put("/:newsId/add-reaction", userAuth, addReaction);
router.put("/:commentId/like-comment", userAuth, likeComment);
router.put("/:commentId/dislike-comment", userAuth, dislikeComment);

router.delete("/:commentId", userAuth, deleteComment);

export default router;
