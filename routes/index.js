// routes/index.js
import { Router } from "express";
import authRoutes from "./authRoutes.js";
import newsRoutes from "./newsRoutes.js";
import userRoutes from "./userRoutes.js";
import galleryRoutes from "./galleryRoutes.js";
import videoRoutes from "./videoRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/news", newsRoutes);
router.use("/gallery", galleryRoutes);
router.use("/videos", videoRoutes);

export default router;
