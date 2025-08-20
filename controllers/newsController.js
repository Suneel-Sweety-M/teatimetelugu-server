import News from "../models/newsModel.js";
import Users from "../models/userModel.js";
import { uploadFile } from "../utils/s3Service.js";
import { generateUniqueSlug } from "../utils/generateUniqueSlug.js";

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
      (currentUser?.role === "admin" || currentUser?.role === "writer") &&
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
      tags: {
        en: tagsEn ? tagsEn.split(",").map((t) => t.trim()) : [],
        te: tagsTe ? tagsTe.split(",").map((t) => t.trim()) : [],
      },
      movieRating: movieRating || 0,
    });

    await newPost.save();

    // ✅ Notify admins & writers
    // const users = await Users.find({
    //   role: { $in: ["admin", "writer"] },
    //   _id: { $ne: user?._id },
    // });

    // users.forEach((u) => {
    //   sendNewsAddedEmail({
    //     res,
    //     email: u.email,
    //     fullName: u.fullName,
    //     postedBy: user?.fullName,
    //     category: categoryEn, // English category for email
    //     imgSrc: mainUrl,
    //     newsTitle: titleEn,
    //     postLink: `${process.env.CLIENT_URL}/${newPost?.category?.en}/${newPost?.newsId}`,
    //   });
    // });

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
    const {
      category,
      time,
      searchText,
      writer,
      cursor, // For cursor-based pagination
      direction = "next", // 'next' or 'prev'
      limit = 10,
      page, // Optional: keep for backward compatibility
    } = req.query;

    // Parse and validate parameters
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    let filter = {};

    // Build your existing filters (category, time, searchText, writer)
    if (category) filter["category.en"] = category;
    if (writer) filter["postedBy"] = writer;

    if (searchText) {
      filter["title.en"] = { $regex: searchText, $options: "i" };
    }

    if (time) {
      const now = new Date();
      // Your existing time filter logic...
    }

    let query = News.find(filter)
      .populate("postedBy", "fullName email")
      .sort({ createdAt: -1 });

    let totalItems;
    let hasNextPage = false;
    let hasPrevPage = false;
    let nextCursor = null;
    let prevCursor = null;

    if (cursor) {
      // Cursor-based pagination
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate)) {
        return res.status(400).json({
          status: "fail",
          message: "Invalid cursor date",
        });
      }

      if (direction === "next") {
        query = query.where("createdAt").lt(cursorDate);
      } else if (direction === "prev") {
        query = query.where("createdAt").gt(cursorDate).sort({ createdAt: 1 });
      }

      query = query.limit(limitNum);
      const news = await query.lean();

      // For prev direction, we need to reverse the results
      if (direction === "prev") {
        news.reverse();
      }

      // Get cursors for navigation
      if (news.length > 0) {
        nextCursor = news[news.length - 1]?.createdAt;
        prevCursor = news[0]?.createdAt;
      }

      // Check if more pages exist
      const nextCheck = await News.findOne({
        ...filter,
        createdAt: { $lt: nextCursor },
      }).select("createdAt");

      const prevCheck = await News.findOne({
        ...filter,
        createdAt: { $gt: prevCursor },
      }).select("createdAt");

      hasNextPage = !!nextCheck;
      hasPrevPage = !!prevCheck;

      totalItems = await News.countDocuments(filter);

      return res.status(200).json({
        status: "success",
        news,
        pagination: {
          totalItems,
          currentCursor: cursor,
          nextCursor: nextCursor?.toISOString(),
          prevCursor: prevCursor?.toISOString(),
          hasNextPage,
          hasPrevPage,
          itemsPerPage: limitNum,
        },
      });
    } else if (page) {
      // Fallback to offset pagination
      const pageNum = Math.max(1, parseInt(page));
      const skip = (pageNum - 1) * limitNum;

      const [news, total] = await Promise.all([
        query.skip(skip).limit(limitNum).lean(),
        News.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      return res.status(200).json({
        status: "success",
        news,
        pagination: {
          totalItems: total,
          currentPage: pageNum,
          totalPages,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      });
    } else {
      // First page load
      const news = await query.limit(limitNum).lean();
      totalItems = await News.countDocuments(filter);

      if (news.length > 0) {
        nextCursor = news[news.length - 1]?.createdAt;
      }

      hasNextPage = news.length === limitNum;

      return res.status(200).json({
        status: "success",
        news,
        pagination: {
          totalItems,
          nextCursor: nextCursor?.toISOString(),
          hasNextPage,
          hasPrevPage: false,
          itemsPerPage: limitNum,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
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

    return res.status(200).json({
      status: "success",
      news,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
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
      news.postedBy.toString() !== user._id.toString() &&
      currentUser.role !== "admin"
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

    // ✅ Update fields
    news.title.en = titleEn || news.title.en;
    news.title.te = titleTe || news.title.te;
    news.description.en = descriptionEn || news.description.en;
    news.description.te = descriptionTe || news.description.te;
    news.category.en = categoryEn || news.category.en;
    news.category.te = categoryTe || news.category.te;
    news.subCategory.en = subCategoryEn || news.subCategory.en;
    news.subCategory.te = subCategoryTe || news.subCategory.te;
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

    // ✅ Only author or admin can delete
    const currentUser = await Users.findById(user?._id);
    if (
      news.postedBy.toString() !== user._id.toString() &&
      currentUser.role !== "admin"
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
