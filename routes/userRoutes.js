import express from "express";
import multer from "multer";
import { userAuth } from "../middlewares/jwt.js";
import { getAdminsWriters, getCurrentUser } from "../controllers/userController.js";
const router = express.Router();

// Initialize multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

router.get("/me", userAuth, getCurrentUser);
router.get("/admins-and-writers", userAuth, getAdminsWriters);

export default router;
