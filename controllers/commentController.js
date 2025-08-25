import Comments from "../models/commentModel.js";

// ✅ Get comments by newsId + language
export const getComments = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { language } = req.query; // pass ?language=en or ?language=te

    if (!newsId) {
      return res.status(400).send({
        status: "fail",
        message: "News id not found!",
      });
    }

    if (!language || !["en", "te"].includes(language)) {
      return res.status(400).send({
        status: "fail",
        message: "Valid language (en/te) is required!",
      });
    }

    const comments = await Comments.find({ newsId, language })
      .populate("postedBy", "fullName profileUrl")
      .populate({
        path: "replies",
        populate: {
          path: "postedBy",
          select: "fullName profileUrl",
        },
      })
      .sort({ createdAt: -1 });

    // Sort replies newest → oldest
    comments.forEach((comment) => {
      if (comment.replies?.length > 0) {
        comment.replies.sort((a, b) => b.createdAt - a.createdAt);
      }
    });

    return res.status(200).send({
      status: "success",
      message: "Comments fetched successfully",
      comments,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: "fail",
      message: error.message,
    });
  }
};

// ✅ Add a top-level comment
export const addComment = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { comment, language } = req.body;
    const { user } = req.user;

    if (!newsId) {
      return res.status(400).send({
        status: "fail",
        message: "News id not found!",
      });
    }

    if (!comment) {
      return res.status(400).send({
        status: "fail",
        message: "Write something!",
      });
    }

    if (!language || !["en", "te"].includes(language)) {
      return res.status(400).send({
        status: "fail",
        message: "Valid language (en/te) is required!",
      });
    }

    const newComment = new Comments({
      newsId,
      postedBy: user?._id,
      comment,
      language,
    });

    await newComment.save();

    return res.status(201).send({
      status: "success",
      message: "Comment added successfully!",
      data: newComment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: "fail",
      message: error.message,
    });
  }
};

// ✅ Add a reply (language auto-inherits from parent)
export const addReplyComment = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { parentCommentId, comment, language } = req.body;
    const { user } = req.user;

    if (!parentCommentId) {
      return res.status(400).send({
        status: "fail",
        message: "Parent comment id is required!",
      });
    }

    if (!comment) {
      return res.status(400).send({
        status: "fail",
        message: "Write something!",
      });
    }

    if (!language) {
      return res.status(400).send({
        status: "fail",
        message: "Language is required!",
      });
    }

    const parentComment = await Comments.findById(parentCommentId);
    if (!parentComment) {
      return res.status(404).send({
        status: "fail",
        message: "Parent comment not found!",
      });
    }

    const newReply = new Comments({
      newsId,
      parentComment: parentCommentId,
      postedBy: user?._id,
      comment,
      language,
    });

    await newReply.save();

    // push reply into parent
    parentComment.replies.push(newReply._id);
    await parentComment.save();

    return res.status(201).send({
      status: "success",
      message: "Reply added successfully!",
      data: newReply,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: "fail",
      message: error.message,
    });
  }
};

// ✅ Delete Comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.user?._id; // assuming you attach user in middleware

    if (!commentId) {
      return res.status(400).send({
        status: "fail",
        message: "Comment ID is required",
      });
    }

    const comment = await Comments.findById(commentId);

    if (!comment) {
      return res.status(404).send({
        status: "fail",
        message: "Comment not found",
      });
    }

    // Check ownership
    if (String(comment.postedBy) !== String(userId)) {
      return res.status(403).send({
        status: "fail",
        message: "You are not allowed to delete this comment",
      });
    }

    // Delete replies if exist
    if (comment.replies?.length > 0) {
      await Comments.deleteMany({ _id: { $in: comment.replies } });
    }

    await Comments.findByIdAndDelete(commentId);

    return res.status(200).send({
      status: "success",
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: "fail",
      message: "An error occurred while deleting the comment",
    });
  }
};

// ✅ Like Comment
export const likeComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.user?._id;

  try {
    if (!commentId) {
      return res.status(400).send({
        status: "fail",
        message: "Comment ID is required",
      });
    }

    const comment = await Comments.findById(commentId);

    if (!comment) {
      return res.status(404).send({
        status: "fail",
        message: "Comment not found",
      });
    }

    const hasLiked = comment.likes.includes(userId);
    const hasDisliked = comment.dislikes.includes(userId);

    if (hasLiked) {
      // remove like
      comment.likes.pull(userId);
    } else {
      if (hasDisliked) comment.dislikes.pull(userId);
      comment.likes.push(userId);
    }

    await comment.save();

    return res.status(200).send({
      status: "success",
      message: hasLiked ? "Like removed" : "Liked successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: "fail",
      message: "An error occurred while liking the comment",
    });
  }
};

// ✅ Dislike Comment
export const dislikeComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.user?._id;

  try {
    if (!commentId) {
      return res.status(400).send({
        status: "fail",
        message: "Comment ID is required",
      });
    }

    const comment = await Comments.findById(commentId);

    if (!comment) {
      return res.status(404).send({
        status: "fail",
        message: "Comment not found",
      });
    }

    const hasDisliked = comment.dislikes.includes(userId);
    const hasLiked = comment.likes.includes(userId);

    if (hasDisliked) {
      // remove dislike
      comment.dislikes.pull(userId);
    } else {
      if (hasLiked) comment.likes.pull(userId);
      comment.dislikes.push(userId);
    }

    await comment.save();

    return res.status(200).send({
      status: "success",
      message: hasDisliked ? "Dislike removed" : "Disliked successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      status: "fail",
      message: "An error occurred while disliking the comment",
    });
  }
};
