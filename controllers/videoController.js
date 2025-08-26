import Videos from "../models/videoModel.js";
import { generateUniqueSlug } from "../utils/generateUniqueSlug.js";

export const addVideo = async (req, res) => {
  try {
    const { title, ytId, subCategory } = req.body;
    const { user } = req.user;

    if (!title.en || !title.te || !ytId) {
      return res.status(400).json({
        status: "fail",
        message: "English & Telugu Titles and YouTube ID are required!",
      });
    }

    if (
      (user?.role !== "admin" && user?.role !== "writer") ||
      user?.isActive === false
    ) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to add videos.",
      });
    }

    const newsId = await generateUniqueSlug(Videos, title.en);

    const newVideo = new Videos({
      postedBy: user._id,
      title,
      newsId,
      mainUrl: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
      videoUrl: `https://www.youtube.com/embed/${ytId}`,
      subCategory,
    });

    await newVideo.save();

    res.status(201).json({
      status: "success",
      message: "Video added successfully",
      data: newVideo,
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.user;

    if (!id) {
      return res.status(400).json({
        status: "fail",
        message: "Video ID is required",
      });
    }

    if (
      (user?.role !== "admin" && user?.role !== "writer") ||
      user?.isActive === false
    ) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to add videos.",
      });
    }

    const video = await Videos.findByIdAndDelete(id);

    if (!video) {
      return res.status(404).json({
        status: "fail",
        message: "Video not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Video deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getFilteredVideos = async (req, res) => {
  try {
    let {
      category,
      time,
      searchText,
      writer,
      page = 1,
      limit = 10,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    // Category filter
    if (category) {
      filter.$or = [
        { category: { $regex: category, $options: "i" } },
        { "subCategory.en": { $regex: category, $options: "i" } },
        { "subCategory.te": { $regex: category, $options: "i" } },
      ];
    }

    // Writer filter
    if (writer && mongoose.Types.ObjectId.isValid(writer)) {
      filter.postedBy = new mongoose.Types.ObjectId(writer);
    }

    // Search filter (title only for videos)
    if (searchText) {
      filter.$or = [
        { "title.en": { $regex: searchText, $options: "i" } },
        { "title.te": { $regex: searchText, $options: "i" } },
      ];
    }

    if (time) {
      const now = new Date();
      let fromDate = null;

      switch (time) {
        // ✅ Within filters
        case "24h":
          fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          filter.createdAt = { $gte: fromDate };
          break;
        case "week":
          fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          filter.createdAt = { $gte: fromDate };
          break;
        case "month":
          fromDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
          filter.createdAt = { $gte: fromDate };
          break;
        case "6months":
          fromDate = new Date(
            now.getFullYear(),
            now.getMonth() - 6,
            now.getDate()
          );
          filter.createdAt = { $gte: fromDate };
          break;
        case "1year":
          fromDate = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate()
          );
          filter.createdAt = { $gte: fromDate };
          break;
        case "2years":
          fromDate = new Date(
            now.getFullYear() - 2,
            now.getMonth(),
            now.getDate()
          );
          filter.createdAt = { $gte: fromDate };
          break;
        case "3years":
          fromDate = new Date(
            now.getFullYear() - 3,
            now.getMonth(),
            now.getDate()
          );
          filter.createdAt = { $gte: fromDate };
          break;

        // ✅ Above filters (older than)
        case "above6months":
          fromDate = new Date(
            now.getFullYear(),
            now.getMonth() - 6,
            now.getDate()
          );
          filter.createdAt = { $lt: fromDate };
          break;
        case "above1year":
          fromDate = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate()
          );
          filter.createdAt = { $lt: fromDate };
          break;
        case "above2years":
          fromDate = new Date(
            now.getFullYear() - 2,
            now.getMonth(),
            now.getDate()
          );
          filter.createdAt = { $lt: fromDate };
          break;
        case "above3years":
          fromDate = new Date(
            now.getFullYear() - 3,
            now.getMonth(),
            now.getDate()
          );
          filter.createdAt = { $lt: fromDate };
          break;

        default:
          break;
      }
    }

    const totalItems = await Videos.countDocuments(filter);

    const videos = await Videos.find(filter)
      .populate("postedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      videos,
      pagination: {
        currentPage: page,
        perPage: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
      status: "success",
    });
  } catch (error) {
    console.error("Error fetching filtered videos:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Video by NewsId
export const getVideoByNewsId = async (req, res) => {
  try {
    const { newsId } = req.params;

    if (!newsId) {
      return res.status(400).json({
        status: "fail",
        message: "newsId parameter is required",
      });
    }

    const post = await Videos.findOne({ newsId })
      .populate("postedBy", "fullName profileUrl")
      .exec();

    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "News not found",
      });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const suggestedVideos = await Videos.aggregate([
      {
        $match: {
          newsId: { $ne: newsId },
          createdAt: { $gte: oneWeekAgo },
        },
      },
      { $sample: { size: 20 } },
    ]);

    return res.status(200).json({
      status: "success",
      message: "Video fetched successfully",
      video: post,
      suggestedVideos,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching the videos",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
