import mongoose from "mongoose";

// Schema
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    // number: {
    //   type: String,
    //   match: [/^\d{10}$/, "Phone number must be 10 digits"], // optional
    // },
    role: {
      type: String,
      enum: ["user", "admin", "writer"],
      default: "user",
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // hide password by default when querying
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    profileUrl: {
      type: String,
      default:
        "https://res.cloudinary.com/demmiusik/image/upload/v1711703262/s66xmxvaoqky3ipbxskj.jpg",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenExpires: Date,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
