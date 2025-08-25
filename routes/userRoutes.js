import express from "express";
import multer from "multer";
import { userAuth } from "../middlewares/jwt.js";
import {
  adMail,
  contactUsMail,
  editProfilePic,
  getAdminsWriters,
  getAdminsWritersAllDetails,
  getCurrentUser,
  getUser,
  langChange,
  registerUserByAdmin,
  updateDetails,
  updateUserPassword,
  userActive,
} from "../controllers/userController.js";
const router = express.Router();

// Initialize multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

router.post("/ad-mail", adMail);
router.post("/contact-mail", contactUsMail);
router.post("/:userId/update-details", userAuth, updateDetails);
router.post("/register-user-by-admin", userAuth, registerUserByAdmin);

router.put("/lang-change", userAuth, langChange);
router.put(
  "/edit-profile-pic/:userId",
  userAuth,
  upload.single("profilePic"),
  editProfilePic
);
router.put("/:userId/update-password", userAuth, updateUserPassword);
router.put("/:userId/update-active-status", userAuth, userActive);

router.get("/me", userAuth, getCurrentUser);
router.get("/admins-and-writers", userAuth, getAdminsWriters);
router.get("/admin/admins-and-writers", userAuth, getAdminsWritersAllDetails);
router.get("/:id", userAuth, getUser);

export default router;
