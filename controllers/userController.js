import mongoose from "mongoose";
import { uploadFile } from "../utils/s3Service.js";
import Users from "../models/userModel.js";
import { hashString } from "../middlewares/jwt.js";
import { sendAdEmail, sendContactUsEmail } from "../utils/mail.js";

// Email validation function using regex
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const getCurrentUser = async (req, res) => {
  try {
    const { user } = req?.user;

    if (!user) {
      return res.status(404).send({
        status: "fail",
        message: "No user!",
      });
    }

    // ✅ Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(user._id)) {
      return res.status(400).send({
        status: "fail",
        message: "Invalid Id!",
      });
    }

    const thisUser = await Users.findOne({ _id: user?._id }).select(
      "-password -otp"
    );

    if (!thisUser) {
      return res.status(404).send({
        status: "fail",
        message: "User not found!",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "User fetched successfully",
      user: {
        _id: thisUser?._id,
        fullName: thisUser?.fullName,
        email: thisUser?.email,
        profileUrl: thisUser?.profileUrl,
        role: thisUser?.role,
        lang: thisUser?.lang,
        isActive: thisUser?.isActive,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      status: "fail",
      message: "Internal Server Error!",
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id?.length !== 24) {
      return res.status(500).json({
        status: "fail",
        message: "Invalid Id!",
      });
    }

    const user = await Users?.findById(id);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found!",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "User Exist!",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const registerUserByAdmin = async (req, res) => {
  const { fullName, email, password, role } = req.body;

  try {
    const admin = req.user.user;

    // Permission check
    if (admin?.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You don't have permission to create accounts!",
      });
    }

    // Validation - check all required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        status: "fail",
        message:
          "Please provide all required fields: fullName, email, and password!",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid email address!",
      });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        status: "fail",
        message: "Password must be at least 6 characters long!",
      });
    }

    // Validate role if provided
    const validRoles = ["admin", "user", "writer"]; // Add your valid roles
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        status: "fail",
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Check if user already exists
    const userExist = await Users.findOne({
      email: email.toLowerCase().trim(),
    });
    if (userExist) {
      return res.status(409).json({
        // 409 Conflict is more appropriate
        status: "fail",
        message: "User already exists with this email!",
      });
    }

    // Hash password
    const hashedPassword = await hashString(password);

    // Create user
    const user = await Users.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      role: role || "user", // Default role if not provided
      password: hashedPassword,
    });

    // Prepare response data (exclude sensitive information)
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profileUrl: user.profileUrl,
      createdAt: user.createdAt,
    };

    return res.status(201).json({
      status: "success",
      message: "User registered successfully!",
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate key errors (if unique index on email)
    if (error.code === 11000 || error.code === 11001) {
      return res.status(409).json({
        status: "fail",
        message: "User already exists with this email!",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "fail",
        message: error.message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getAdminsWriters = async (req, res) => {
  try {
    const { user } = req.user;

    const users = await Users.find(
      {
        role: { $in: ["admin", "writer"] },
        _id: { $ne: user?._id },
      },
      { _id: 1, fullName: 1 }
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No users found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched Writers and Admins",
      users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const getAdminsWritersAllDetails = async (req, res) => {
  try {
    const { user } = req.user;

    if (user?.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You don't have permission!",
      });
    }

    const users = await Users.find({
      role: { $in: ["admin", "writer"] },
      _id: { $ne: user?._id },
    });

    if (!users || users.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No users found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched Writers and Admins",
      users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const editProfilePic = async (req, res) => {
  try {
    const { user } = req.user;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).send({
        status: "fail",
        message: "User Id not found!",
      });
    }

    if (user?.role !== "admin" && user?._id !== userId) {
      return res.status(403).send({
        status: "fail",
        message: "You don't have permission!",
      });
    }

    const currentUser = await Users.findOne({ _id: userId });
    if (!currentUser) {
      return res.status(400).send({
        status: "fail",
        message: "User not found!",
      });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).send({
        status: "fail",
        message: "No file uploaded!",
      });
    }

    const file = req.file;

    // Upload file to S3
    const uploadResult = await uploadFile(file);

    // Update user's profile URL
    currentUser.profileUrl = uploadResult.Location;

    await currentUser.save();

    return res.status(200).send({
      status: "success",
      message: "Profile Pic edited successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: "fail",
      message: "Internal Server Error!",
    });
  }
};

export const updateDetails = async (req, res) => {
  try {
    const { fullName, email, role } = req.body;
    const { userId } = req.params;
    const currentUser = req.user.user;

    // Validate userId format
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID format",
      });
    }

    // Permission check - only admin can update
    if (currentUser.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You don't have permission to update details!",
      });
    }

    // Check if at least one field is provided
    if (!fullName && !email && !role) {
      return res.status(400).json({
        status: "fail",
        message: "Provide at least one field to update",
      });
    }

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid email address",
      });
    }

    // Validate role if provided
    if (role && !["admin", "user", "writer"].includes(role)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid role specified",
      });
    }

    // Check if email already exists (for different user)
    if (email) {
      const existingUser = await Users.findOne({
        email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(409).json({
          status: "fail",
          message: "Email already exists",
        });
      }
    }

    // Build update object
    const updateData = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (role && currentUser.role === "admin") updateData.role = role;

    // Update user
    const updatedUser = await Users.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true, // Ensures mongoose validation runs
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User details updated successfully",
      data: {
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      },
    });
  } catch (error) {
    console.error("Update user error:", error);

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "fail",
        message: error.message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const updateUserPassword = async (req, res) => {
  try {
    const { newPassword, cnewPassword } = req.body;
    const { user } = req.user;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).send({
        status: "fail",
        message: "Provide user id!",
      });
    }

    if (userId?.length !== 24) {
      return res.status(400).send({
        status: "fail",
        message: "Invalid user id!",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).send({
        status: "fail",
        message: "Password must be more than 6 charecters!",
      });
    }

    if (newPassword !== cnewPassword) {
      return res.status(401).send({
        status: "fail",
        message: "Password and Confirm password not mached!",
      });
    }

    if (user?.role !== "admin") {
      return res.status(401).send({
        status: "fail",
        message: "You don't have permission to change password!  ",
      });
    }

    const hashedpassword = await hashString(newPassword);

    const cuser = await Users.findById(userId);

    if (!cuser) {
      return res.status(401).send({
        status: "fail",
        message: "Invalid or expired reset token",
      });
    }

    cuser.password = hashedpassword;

    await cuser.save();

    return res.status(200).send({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    return res
      .status(501)
      .send({ status: "fail", message: "Password reset error!", error });
  }
};

export const userActive = async (req, res) => {
  try {
    const { userId } = req.params;
    const { user } = req.user;

    if (!userId) {
      return res.status(400).json({
        status: "fail",
        message: "Provide UserId!",
      });
    }

    if (user?.role !== "admin") {
      return res.status(400).json({
        status: "fail",
        message: "You don't have access to change!",
      });
    }

    const updateUser = await Users.findById(userId);

    if (!updateUser) {
      return res.status(400).json({
        status: "fail",
        message: "User not found!",
      });
    }

    updateUser.isActive = !updateUser.isActive;

    await updateUser.save();

    return res.status(200).json({
      status: "success",
      message: "Active status updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const langChange = async (req, res) => {
  try {
    const { lang } = req.body;
    const { user } = req.user;

    if (!lang) {
      return res.status(400).json({
        status: "fail",
        message: "Provide language!",
      });
    }

    const updateUser = await Users.findById(user._id);

    if (!updateUser) {
      return res.status(400).json({
        status: "fail",
        message: "User not found!",
      });
    }

    updateUser.lang = lang;

    await updateUser.save();

    return res.status(200).json({
      status: "success",
      message: "Language updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

//========= USER =========

export const contactUsMail = async (req, res) => {
  try {
    const { email, fullName, subject, message } = req.body;

    if ((!email, !fullName, !subject, !message)) {
      return res.status(404).json({
        status: "fail",
        message: "Enter all details.",
      });
    }

    sendContactUsEmail({ email, fullName, subject, message, res });

    return res.status(200).json({
      status: "success",
      message: "Message sent successfully :)",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const adMail = async (req, res) => {
  try {
    const { email, fullName, subject, message, page, adSize } = req.body;

    if (page == "") {
      return res.status(404).json({
        status: "fail",
        message: "Select page.",
      });
    }

    if (adSize == "") {
      return res.status(404).json({
        status: "fail",
        message: "Select Ad Size.",
      });
    }

    if ((!email, !fullName, !subject, !message)) {
      return res.status(404).json({
        status: "fail",
        message: "Enter all details.",
      });
    }

    sendAdEmail({ email, fullName, subject, message, page, adSize, res });

    return res.status(200).json({
      status: "success",
      message: "Message sent successfully :)",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};
