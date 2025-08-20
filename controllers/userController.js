import mongoose from "mongoose";
import Users from "../models/userModel.js";

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

export const getAdminsWriters = async (req, res) => {
  try {
    const { user } = req.user;

    const users = await Users.find({
      role: { $in: ["admin", "writer"] },
      _id: { $ne: user?._id },
    });

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
