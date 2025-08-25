import { Router } from "express";
import {
  googleCallback,
  joinWithGoogle,
  login,
  logout,
  register,
} from "../controllers/authController.js";

const router = Router();

router.get("/join-with-google", joinWithGoogle);
router.get("/google/callback", googleCallback);

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;
