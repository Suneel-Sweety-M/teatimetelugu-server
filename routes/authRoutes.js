import { Router } from "express";
import {
  googleCallback,
  login,
  logout,
  register,
} from "../controllers/authController.js";
import passport from "passport";

const router = Router();

router.get("/join-with-google", passport.authenticate("google", { scope: ["profile", "email"] })); 
router.get("/google/callback", googleCallback);

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;
