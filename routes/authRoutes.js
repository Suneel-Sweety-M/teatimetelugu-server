// routes/authRoutes.js
import { Router } from "express";
import passport from "passport";
import Users from "../models/userModel.js";
import { createJWT, verifyRefreshJWT } from "../middlewares/jwt.js";
import { login, register } from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

export default router;
