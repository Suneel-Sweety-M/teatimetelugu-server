import sanitizeHtml from "sanitize-html";
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

    // ✅ sanitize & prepare dual descriptions
    const enHtml = sanitizeHtml(descriptionEn, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "iframe"]),
    });
    const teHtml = sanitizeHtml(descriptionTe, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "iframe"]),
    });

    const enText = sanitizeHtml(descriptionEn, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
    const teText = sanitizeHtml(descriptionTe, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();

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
      enDescription: enText,
      teTitle: titleTe,
      teDescription: teText,
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
      description: { enHtml, enText, teHtml, teText },
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

// export const getFilteredNews = async (req, res) => {
//   try {
//     let {
//       category = "",
//       time = "",
//       searchText = "",
//       writer = "",
//       page = 1,
//       limit = 10,
//     } = req.query;

//     page = Math.max(parseInt(page, 10) || 1, 1);
//     limit = Math.min(parseInt(limit, 10) || 10, 100);
//     const skip = (page - 1) * limit;

//     const match = {};

//     // Category (exact match for index usage)
//     if (category) match["category.en"] = category.toLowerCase();

//     // Writer filter
//     if (writer && mongoose.Types.ObjectId.isValid(writer)) {
//       match.postedBy = new mongoose.Types.ObjectId(writer);
//     }

//     // Search text (only if >=3 chars)
//     if (searchText && searchText.trim().length > 2) {
//       match.$text = { $search: searchText.trim() };
//     }

//     // Time filter
//     if (time) {
//       const now = new Date();
//       const timeMap = {
//         "24h": new Date(now.getTime() - 24 * 60 * 60 * 1000),
//         week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
//         month: new Date(now.setMonth(now.getMonth() - 1)),
//         "6months": new Date(now.setMonth(now.getMonth() - 6)),
//         "1year": new Date(now.setFullYear(now.getFullYear() - 1)),
//         "2years": new Date(now.setFullYear(now.getFullYear() - 2)),
//         "3years": new Date(now.setFullYear(now.getFullYear() - 3)),
//       };

//       if (time.startsWith("above")) {
//         const cutoff = timeMap[time.replace("above", "")];
//         if (cutoff) match.createdAt = { $lt: cutoff };
//       } else if (timeMap[time]) {
//         match.createdAt = { $gte: timeMap[time] };
//       }
//     }

//     // ✅ Aggregation pipeline
//     const results = await News.aggregate([
//       { $match: match },
//       { $sort: { createdAt: -1 } },
//       {
//         $facet: {
//           news: [
//             { $skip: skip },
//             { $limit: limit },
//             {
//               $lookup: {
//                 from: "users",
//                 localField: "postedBy",
//                 foreignField: "_id",
//                 pipeline: [{ $project: { fullName: 1, profileUrl: 1 } }],
//                 as: "postedBy",
//               },
//             },
//             {
//               $unwind: { path: "$postedBy", preserveNullAndEmptyArrays: true },
//             },
//           ],
//           totalItems: [{ $count: "count" }],
//         },
//       },
//     ]).allowDiskUse(true);

//     const news = results[0]?.news || [];
//     const totalItems = results[0]?.totalItems[0]?.count || 0;

//     return res.status(200).json({
//       status: "success",
//       message: "News fetched successfully",
//       data: {
//         news,
//         pagination: {
//           currentPage: page,
//           perPage: limit,
//           totalItems,
//           totalPages: Math.ceil(totalItems / limit),
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching filtered news:", error);
//     res.status(500).json({
//       status: "error",
//       message: "Failed to fetch news",
//       error: process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };

export const getFilteredNews = async (req, res) => {
  try {
    let {
      category = "",
      time = "",
      searchText = "",
      writer = "",
      page = 1,
      limit = 10,
      cursor = null,
    } = req.query;

    limit = Math.min(parseInt(limit, 10) || 10, 100);
    page = Math.max(parseInt(page, 10) || 1, 1);

    const match = {};

    // Category filter (index friendly)
    if (category) match["category.en"] = category.toLowerCase();

    // Writer filter
    if (writer && mongoose.Types.ObjectId.isValid(writer)) {
      match.postedBy = new mongoose.Types.ObjectId(writer);
    }

    // Search text
    if (searchText && searchText.trim().length > 2) {
      match.$text = { $search: searchText.trim() };
    }

    // Time filter
    if (time) {
      const now = new Date();
      const timeMap = {
        "24h": new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.setMonth(now.getMonth() - 1)),
        "6months": new Date(now.setMonth(now.getMonth() - 6)),
        "1year": new Date(now.setFullYear(now.getFullYear() - 1)),
        "2years": new Date(now.setFullYear(now.getFullYear() - 2)),
        "3years": new Date(now.setFullYear(now.getFullYear() - 3)),
      };

      if (time.startsWith("above")) {
        const cutoff = timeMap[time.replace("above", "")];
        if (cutoff) match.createdAt = { $lt: cutoff };
      } else if (timeMap[time]) {
        match.createdAt = { $gte: timeMap[time] };
      }
    }

    let news = [];
    let nextCursor = null;
    let hasMore = false;
    let totalItems = 0;

    if (cursor) {
      // ✅ Cursor-based fetch
      const [createdAt, id] = cursor.split("_");
      match.$or = [
        { createdAt: { $lt: new Date(createdAt) } },
        {
          createdAt: new Date(createdAt),
          _id: { $lt: new mongoose.Types.ObjectId(id) },
        },
      ];

      news = await News.find(match)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .populate("postedBy", "fullName profileUrl")
        .lean()
        .exec();

      if (news.length > limit) {
        const last = news[limit - 1];
        nextCursor = `${last.createdAt.toISOString()}_${last._id.toString()}`;
        hasMore = true;
      }

      news = news.slice(0, limit);
    } else {
      // ✅ Page-based fetch
      const skip = (page - 1) * limit;
      totalItems = await News.countDocuments(match);

      news = await News.find(match)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("postedBy", "fullName profileUrl")
        .lean()
        .exec();
    }

    return res.status(200).json({
      status: "success",
      message: "News fetched successfully",
      data: {
        news,
        pagination: {
          // page info
          currentPage: cursor ? null : page,
          perPage: limit,
          totalItems: cursor ? null : totalItems,
          totalPages: cursor ? null : Math.ceil(totalItems / limit) || 1,
          // cursor info
          nextCursor,
          hasMore,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching filtered news:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch news",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

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

// ✅ Edit News by ID
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
      return res
        .status(404)
        .json({ status: "fail", message: "News not found!" });
    }

    // ✅ Only author or admin can edit
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

    // ✅ Upload new image only if provided
    let mainUrl = news.mainUrl;
    if (req.file) {
      const uploadResult = await uploadFile(req.file);
      mainUrl = uploadResult.Location;
    }

    // ✅ Detect changes for audio
    const enChanged =
      (titleEn && titleEn !== news.title.en) ||
      (descriptionEn && descriptionEn !== news.description.en);

    const teChanged =
      (titleTe && titleTe !== news.title.te) ||
      (descriptionTe && descriptionTe !== news.description.te);

    let audioFiles = {};
    if (enChanged || teChanged) {
      // Clear only if regenerating
      if (enChanged) news.newsAudio.en = null;
      if (teChanged) news.newsAudio.te = null;

      audioFiles = await generateAudioForTexts({
        enTitle: enChanged ? titleEn : news.title.en,
        enDescription: enChanged ? descriptionEn : news.description.en,
        teTitle: teChanged ? titleTe : news.title.te,
        teDescription: teChanged ? descriptionTe : news.description.te,
      });
    }

    // ✅ Update only changed fields
    if (titleEn) news.title.en = titleEn;
    if (titleTe) news.title.te = titleTe;
    if (descriptionEn) news.description.en = descriptionEn;
    if (descriptionTe) news.description.te = descriptionTe;
    if (categoryEn) news.category.en = categoryEn;
    if (categoryTe) news.category.te = categoryTe;
    if (subCategoryEn) news.subCategory.en = subCategoryEn;
    if (subCategoryTe) news.subCategory.te = subCategoryTe;
    if (tagsEn) news.tags.en = tagsEn.split(",").map((t) => t.trim());
    if (tagsTe) news.tags.te = tagsTe.split(",").map((t) => t.trim());
    if (typeof movieRating !== "undefined") news.movieRating = movieRating;
    if (mainUrl) news.mainUrl = mainUrl;

    // ✅ Assign new audio if generated
    if (audioFiles.en) news.newsAudio.en = audioFiles.en;
    if (audioFiles.te) news.newsAudio.te = audioFiles.te;

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
      .limit(10)
      .lean();

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
