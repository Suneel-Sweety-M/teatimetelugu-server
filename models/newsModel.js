// models/newsModel.js
import mongoose, { Schema } from "mongoose";

//schema
const newsSchema = new mongoose.Schema(
  {
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    newsId: {
      type: String,
      unique: true, 
      index: true,
    },

    // Titles in both languages
    title: {
      en: { type: String, required: [true, "English title is required!"] },
      te: { type: String, required: [true, "Telugu title is required!"] },
    },

    // Main image / video
    mainUrl: {
      type: String,
      required: true,
    },

    // Descriptions in both languages
    description: {
      en: {
        type: String,
        required: [true, "English description is required!"],
      },
      te: { type: String, required: [true, "Telugu description is required!"] },
    },

    // Category in both languages
    category: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },

    // Optional sub-category
    subCategory: {
      en: { type: String },
      te: { type: String },
    },

    movieRating: {
      type: Number,
      default: 0,
    },

    newsAudio: {
      en: { type: String }, // English audio file URL
      te: { type: String }, // Telugu audio file URL
    },

    // Reactions (like 👍, ❤️, etc.)
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
        type: { type: String, required: true },
      },
    ],

    // Tags (can hold both English & Telugu tags)
    tags: {
      en: { type: [String] },
      te: { type: [String] },
    },
  },
  { timestamps: true }
);

const News = mongoose.model("News", newsSchema);

export default News;
