import mongoose, { Schema } from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    newsId: {
      type: String,
      required: [true, "News ID is required!"],
      index: true,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      required: [true, "Comment text is required!"],
    },
    language: {
      type: String,
      enum: ["en", "te"], // English or Telugu
      required: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comments",
      default: null,
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comments",
      },
    ],
    likes: {
      type: [Schema.Types.ObjectId],
      ref: "Users",
      default: [],
    },
    dislikes: {
      type: [Schema.Types.ObjectId],
      ref: "Users",
      default: [],
    },
  },
  { timestamps: true }
);

const Comments = mongoose.model("Comments", commentSchema);

export default Comments;
