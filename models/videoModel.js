import mongoose, { Schema } from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      en: { type: String, required: [true, "Title in English is required!"] },
      te: { type: String, required: [true, "Title in Telugu is required!"] },
    },
    newsId: {
      type: String,
      unique: true,
      index: true,
    },
    mainUrl: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    category: {
      type: String,
      default: "videos",
    },
    subCategory: {
      en: { type: String },
      te: { type: String },
    },
  },
  { timestamps: true }
);

const Videos = mongoose.model("Videos", videoSchema);

export default Videos;
