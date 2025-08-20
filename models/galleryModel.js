import mongoose, { Schema } from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    title: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    newsId: {
      type: String,
      unique: true,
      index: true,
    },
    mainUrl: {
      type: String,
    },
    description: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    category: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    galleryPics: {
      type: [String], // array of image URLs
    },
    tags: [
      {
        en: { type: String },
        te: { type: String },
      },
    ],
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
        type: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Gallery = mongoose.model("Gallery", gallerySchema);

export default Gallery;
