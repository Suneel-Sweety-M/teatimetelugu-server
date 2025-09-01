import News from "../models/newsModel.js";
import Users from "../models/userModel.js";
import { uploadFile } from "../utils/s3Service.js";
import { generateUniqueSlug } from "../utils/generateUniqueSlug.js";
import mongoose from "mongoose";
import { generateAudioForTexts } from "../utils/audio.js";
import { sendNewsAddedEmail } from "../utils/mail.js";

export const addNews = async (req, res) => {
  // Check if req.body exists
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      status: "fail",
      message: "Invalid request body",
    });
  }
  try {
    const {
      titleEn,
      titleTe,
      descriptionEn,
      descriptionTe,
      categoryEn,
      categoryTe,
      subCategoryEn,
      subCategoryTe,
      tagsEn,
      tagsTe,
      movieRating,
    } = req.body;

    const { user } = req.user;

    // ✅ Validate required fields
    if (!titleEn || !titleTe) {
      return res.status(400).json({
        status: "fail",
        message: "Titles in both languages are required!",
      });
    }

    if (!descriptionEn || !descriptionTe) {
      return res.status(400).json({
        status: "fail",
        message: "Descriptions in both languages are required!",
      });
    }

    if (!categoryEn || !categoryTe) {
      return res.status(400).json({
        status: "fail",
        message: "Categories in both languages are required!",
      });
    }

    if (!tagsEn?.length && !tagsTe?.length) {
      return res
        .status(400)
        .json({ status: "fail", message: "At least one tag is required!" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    const currentUser = await Users.findById(user?._id);

    if (
      (currentUser?.role !== "admin" && currentUser?.role !== "writer") ||
      currentUser?.isActive === false
    ) {
      return res.status(403).json({
        status: "fail",
        message: "You don't have permission to post!",
      });
    }

    // ✅ Upload main image / video
    let mainUrl = "";
    if (req.file) {
      const uploadResult = await uploadFile(req.file);
      mainUrl = uploadResult.Location;
    } else {
      return res
        .status(400)
        .json({ status: "fail", message: "Main image is required!" });
    }

    // ✅ Generate unique newsId
    const newsId = await generateUniqueSlug(News, titleEn);
    const audioFiles = await generateAudioForTexts({
      enTitle: titleEn,
      enDescription: descriptionEn,
      teTitle: titleTe,
      teDescription: descriptionTe,
    });

    // ✅ Create new post
    const newPost = new News({
      postedBy: user?._id,
      newsId,
      mainUrl,
      title: {
        en: titleEn,
        te: titleTe,
      },
      description: {
        en: descriptionEn,
        te: descriptionTe,
      },
      category: {
        en: categoryEn,
        te: categoryTe,
      },
      subCategory: {
        en: subCategoryEn || "",
        te: subCategoryTe || "",
      },
      newsAudio: {
        en: audioFiles.en,
        te: audioFiles.te,
      },
      tags: {
        en: tagsEn ? tagsEn.split(",").map((t) => t.trim()) : [],
        te: tagsTe ? tagsTe.split(",").map((t) => t.trim()) : [],
      },
      movieRating: movieRating || 0,
    });

    await newPost.save();

    // ✅ Notify admins & writers
    const users = await Users.find({
      role: { $in: ["admin", "writer"] },
      _id: { $ne: user?._id },
    });

    users.forEach((u) => {
      sendNewsAddedEmail({
        res,
        email: u.email,
        fullName: u.fullName,
        postedBy: user?.fullName,
        category: categoryEn, // English category for email
        imgSrc: mainUrl,
        newsTitle: titleEn,
        postLink: `${process.env.CLIENT_URL}/${newPost?.category?.en}/${newPost?.newsId}`,
      });
    });

    return res.status(201).json({
      status: "success",
      message: "News added successfully",
      news: newPost,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

// In your backend controller
export const getFilteredNews = async (req, res) => {
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
        { "category.en": { $regex: category, $options: "i" } },
        { "category.te": { $regex: category, $options: "i" } },
      ];
    }

    // Writer filter
    if (writer && mongoose.Types.ObjectId.isValid(writer)) {
      filter.postedBy = new mongoose.Types.ObjectId(writer);
    }

    // Search filter (title + description + tags)
    if (searchText) {
      filter.$or = [
        { "title.en": { $regex: searchText, $options: "i" } },
        { "title.te": { $regex: searchText, $options: "i" } },
        { "description.en": { $regex: searchText, $options: "i" } },
        { "description.te": { $regex: searchText, $options: "i" } },
        { "tags.en": { $in: [new RegExp(searchText, "i")] } },
        { "tags.te": { $in: [new RegExp(searchText, "i")] } },
      ];
    }

    // Time filter
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

    // Count total docs for pagination
    const totalItems = await News.countDocuments(filter);

    // Fetch paginated news
    const news = await News.find(filter)
      .populate("postedBy", "fullName profileUrl")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      news,
      pagination: {
        currentPage: page,
        perPage: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
      status: "success",
    });
  } catch (error) {
    console.error("Error fetching filtered news:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get News by ID
export const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "fail",
        message: "News ID is required!",
      });
    }

    const news = await News.findById(id).populate(
      "postedBy",
      "fullName profileUrl role"
    );

    if (!news) {
      return res.status(404).json({
        status: "fail",
        message: "News not found!",
      });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const suggestedNews = await News.aggregate([
      {
        $match: {
          newsId: { $ne: id },
          createdAt: { $gte: oneWeekAgo },
        },
      },
      { $sample: { size: 20 } },
    ]);

    return res.status(200).json({
      status: "success",
      news,
      suggestedNews,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

// Get News by NewsId
export const getNewsByNewsId = async (req, res) => {
  try {
    const { newsId } = req.params;

    if (!newsId) {
      return res.status(400).json({
        status: "fail",
        message: "newsId parameter is required",
      });
    }

    const post = await News.findOne({ newsId })
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

    const suggestedNews = await News.aggregate([
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
      message: "News fetched successfully",
      news: post,
      suggestedNews,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching the news",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ✅ Edit News
export const editNews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: "fail",
        message: "News ID is required!",
      });
    }

    const {
      titleEn,
      titleTe,
      descriptionEn,
      descriptionTe,
      categoryEn,
      categoryTe,
      subCategoryEn,
      subCategoryTe,
      tagsEn,
      tagsTe,
      movieRating,
    } = req.body;

    const { user } = req.user;

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        status: "fail",
        message: "News not found!",
      });
    }

    // ✅ Only the author or admin can edit
    const currentUser = await Users.findById(user?._id);
    if (
      (currentUser.role !== "writer" && currentUser.role !== "admin") ||
      currentUser.isActive === false
    ) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to edit this news!",
      });
    }

    // ✅ Upload new image if provided
    let mainUrl = news.mainUrl;
    if (req.file) {
      const uploadResult = await uploadFile(req.file);
      mainUrl = uploadResult.Location;
    }

    // ✅ Clear old audio files if they exist
    if (news.newsAudio) {
      news.newsAudio.en = null;
      news.newsAudio.te = null;
    }

    const audioFiles = await generateAudioForTexts({
      enTitle: titleEn,
      enDescription: descriptionEn,
      teTitle: titleTe,
      teDescription: descriptionTe,
    });

    // ✅ Update fields
    news.title.en = titleEn || news.title.en;
    news.title.te = titleTe || news.title.te;
    news.description.en = descriptionEn || news.description.en;
    news.description.te = descriptionTe || news.description.te;
    news.category.en = categoryEn || news.category.en;
    news.category.te = categoryTe || news.category.te;
    news.subCategory.en = subCategoryEn || news.subCategory.en;
    news.subCategory.te = subCategoryTe || news.subCategory.te;
    news.newsAudio.en = audioFiles.enAudio || news.newsAudio.en;
    news.newsAudio.te = audioFiles.teAudio || news.newsAudio.te;
    news.tags.en = tagsEn
      ? tagsEn.split(",").map((t) => t.trim())
      : news.tags.en;
    news.tags.te = tagsTe
      ? tagsTe.split(",").map((t) => t.trim())
      : news.tags.te;
    news.movieRating = movieRating ?? news.movieRating;
    news.mainUrl = mainUrl;

    await news.save();

    return res.status(200).json({
      status: "success",
      message: "News updated successfully",
      news,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

// ✅ Delete News
export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.user;

    if (!id) {
      return res.status(400).json({
        status: "fail",
        message: "News ID is required!",
      });
    }

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        status: "fail",
        message: "News not found!",
      });
    }

    // ✅ Only writer or admin can delete
    const currentUser = await Users.findById(user?._id);
    if (
      (currentUser.role !== "writer" && currentUser.role !== "admin") ||
      currentUser.isActive === false
    ) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this news!",
      });
    }

    await news.deleteOne();

    return res.status(200).json({
      status: "success",
      message: "News deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

//========= Frontend =========
export const getCategoryNews = async (req, res) => {
  try {
    const { category, subcategory, page = 1, limit = 12 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const safePage = Math.max(pageNum, 1);
    const safeLimit = Math.min(Math.max(limitNum, 1), 100);

    const filter = {};
    if (category) filter["category.en"] = category;
    if (subcategory) filter["subCategory.en"] = subcategory;

    const total = await News.countDocuments(filter);

    const news = await News.find(filter)
      .populate("postedBy", "fullName profileUrl")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
      .exec();

    return res.status(200).json({
      status: "success",
      message: "Fetched News successfully",
      news,
      total,
      page: safePage,
      lastPage: Math.ceil(total / safeLimit),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { type } = req.body;
    const userId = req.user.user?._id;

    if (!newsId) {
      return res
        .status(404)
        .send({ status: "fail", message: "News id not found!" });
    }

    if (!type) {
      return res
        .status(404)
        .send({ status: "fail", message: "Reaction type is not found!" });
    }

    if (!userId) {
      return res
        .status(404)
        .send({ status: "fail", message: "User id not found!" });
    }

    const news = await News.findById(newsId);
    if (!news) {
      return res
        .status(404)
        .send({ status: "fail", message: "News post not found" });
    }

    const existingReactionIndex = news.reactions.findIndex(
      (reaction) => reaction.userId.toString() === userId.toString()
    );

    if (existingReactionIndex >= 0) {
      news.reactions[existingReactionIndex].type = type;
    } else {
      news.reactions.push({ userId, type });
    }

    await news.save();

    res.status(200).send({
      status: "success",
      message: "Reaction added/updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      status: "fail",
      message: error.message,
    });
  }
};

//========= Home News =========
export const getLatestNews = async (req, res) => {
  try {
    const news = await News.find()
      .populate("postedBy", "fullName profileUrl")
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(10) // Limit to latest 10 news
      .exec();

    return res.status(200).json({
      status: "success",
      message: "Fetched latest 10 News successfully",
      news,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

export const getTrendingNews = async (req, res) => {
  try {
    // 7 days ago date
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const trendingNews = await News.aggregate([
      {
        $match: {
          createdAt: { $gte: oneWeekAgo }, // only news from last 7 days
        },
      },
      // Lookup comments count
      {
        $lookup: {
          from: "comments", // your comments collection name
          localField: "_id",
          foreignField: "news", // field in Comments that links to News
          as: "commentsData",
        },
      },
      {
        $addFields: {
          commentsCount: { $size: "$commentsData" },
          reactionsCount: { $size: "$reactions" }, // assuming reactions is an array
        },
      },
      {
        $sort: {
          reactionsCount: -1,
          commentsCount: -1,
        },
      },
      {
        $limit: 10, // get top 10
      },
    ]);

    // Populate postedBy manually after aggregation
    const populatedNews = await News.populate(trendingNews, {
      path: "postedBy",
      select: "fullName profileUrl",
    });

    return res.status(200).json({
      status: "success",
      message: "Trending news fetched successfully",
      news: populatedNews,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};