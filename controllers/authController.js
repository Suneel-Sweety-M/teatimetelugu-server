import JWT from "jsonwebtoken";
import {
  compareString,
  createJWT,
  createRefreshJWT,
  hashString,
} from "../middlewares/jwt.js";
import Users from "../models/userModel.js";
import passport from "passport";
import nodemailer from "nodemailer";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
  const { fullName, email, password, role = "user" } = req.body;

  try {
    // Validation
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Full name, email, and password are required!",
      });
    }

    // Email format validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid email address",
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        status: "fail",
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user exists
    const userExist = await Users.findOne({ email: email.toLowerCase() });

    if (userExist) {
      return res.status(409).json({
        status: "fail",
        message: "User already exists with this email. Please login!",
      });
    }

    // Hash password
    const hashedPassword = await hashString(password);

    // Create user
    const user = await Users.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      role,
      password: hashedPassword,
    });

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(201).json({
      status: "success",
      message: "Registered successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate key errors (other than email)
    if (error.code === 11000) {
      return res.status(409).json({
        status: "fail",
        message: "User with these details already exists",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        status: "fail",
        message: "Validation failed",
        errors,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    // Check if req.body exists
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        status: "fail",
        message: "Request body is missing or invalid.",
      });
    }

    const { email, password } = req.body;

    // Validation - check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Email and password are required.",
      });
    }

    // Additional validation for string types
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        status: "fail",
        message: "Email and password must be strings.",
      });
    }

    // Trim and validate
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Email and password cannot be empty.",
      });
    }

    // Email format validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid email address.",
      });
    }

    // Find user with password field included
    const user = await Users.findOne({ email: trimmedEmail.toLowerCase() })
      .select("+password")
      .select("+refreshToken");

    if (!user) {
      // Use the same error message for security
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        status: "fail",
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Verify password
    const isMatch = await compareString(trimmedPassword, user.password);

    if (!isMatch) {
      // Use the same error message for security
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password.",
      });
    }

    // Generate tokens
    const tokenUser = {
      _id: user._id,
      fullName: user.fullName,
      profileUrl: user.profileUrl,
      email: user.email,
      role: user.role,
    };

    const token = createJWT(tokenUser);
    const refreshToken = createRefreshJWT(tokenUser);

    // Update refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Prepare user response without sensitive data
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profileUrl: user.profileUrl,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      status: "success",
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);

    // Handle specific errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "fail",
        message: "Validation error",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
