import mongoose, { Schema } from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    postedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    newsId: { type: String, unique: true, index: true },

    title: {
      en: { type: String, required: true, trim: true },
      te: { type: String, required: true, trim: true },
    },

    mainUrl: { type: String, required: true },

    description: {
      enHtml: { type: String, required: true },
      teHtml: { type: String, required: true },
      enText: { type: String, required: true, trim: true },
      teText: { type: String, required: true, trim: true },
    },

    category: {
      en: { type: String, required: true, lowercase: true, trim: true },
      te: { type: String, required: true, trim: true },
    },

    subCategory: {
      en: { type: String, default: "" },
      te: { type: String, default: "" },
    },

    movieRating: { type: Number, default: 0, min: 0, max: 10 },

    newsAudio: {
      en: { type: String },
      te: { type: String },
    },

    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        type: { type: String, required: true },
      },
    ],

    tags: {
      en: { type: [String], default: [] },
      te: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

// Indexes for performance
newsSchema.index({ "category.en": 1, createdAt: -1, _id: -1 });
newsSchema.index({ postedBy: 1, createdAt: -1, _id: -1 });
newsSchema.index({ createdAt: -1, _id: -1 });
newsSchema.index({ "tags.en": 1 });
newsSchema.index({ "tags.te": 1 });

// Text index for search
newsSchema.index(
  {
    "title.en": "text",
    "title.te": "text",
    "description.enText": "text",
    "description.teText": "text",
    "tags.en": "text",
    "tags.te": "text",
  },
  {
    name: "TextIndex",
    default_language: "none",
    weights: {
      "title.en": 5,
      "title.te": 5,
      "description.enText": 2,
      "description.teText": 2,
      "tags.en": 3,
      "tags.te": 3,
    },
  }
);

export default mongoose.model("News", newsSchema);
