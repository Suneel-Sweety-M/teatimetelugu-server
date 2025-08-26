import Gallery from "../models/galleryModel.js";
import Users from "../models/userModel.js";
import { uploadFile, deleteFile } from "../utils/s3Service.js";
import { generateUniqueSlug } from "../utils/generateUniqueSlug.js";
import { generateAudioForTexts } from "../utils/audio.js";

export const addGallery = async (req, res) => {
  try {
    const {
      titleEn,
      titleTe,
      nameEn,
      nameTe,
      descriptionEn,
      descriptionTe,
      categoryEn,
      categoryTe,
      tagsEn,
      tagsTe,
    } = req.body;

    const { user } = req.user;

    // ✅ Required fields
    if (!titleEn || !titleTe)
      return res
        .status(400)
        .json({ status: "fail", message: "Both titles required!" });
    if (!nameEn || !nameTe)
      return res
        .status(400)
        .json({ status: "fail", message: "Both names required!" });
    if (!descriptionEn || !descriptionTe)
      return res
        .status(400)
        .json({ status: "fail", message: "Both descriptions required!" });
    if (!categoryEn || !categoryTe)
      return res
        .status(400)
        .json({ status: "fail", message: "Both categories required!" });

    if (!user)
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });

    const currentUser = await Users.findById(user?._id);
    if (
      (currentUser.role !== "admin" && currentUser.role !== "writer") ||
      currentUser.isActive === false
    ) {
      return res
        .status(403)
        .json({ status: "fail", message: "You don't have permission!" });
    }

    // ✅ Upload gallery images
    const galleryPics = [];
    for (const file of req.files) {
      const uploadResult = await uploadFile(file);
      galleryPics.push(uploadResult.Location);
    }

    // ✅ Generate unique slug
    const newsId = await generateUniqueSlug(Gallery, titleEn);
    const audioFiles = await generateAudioForTexts({
      enTitle: titleEn,
      enDescription: descriptionEn,
      teTitle: titleTe,
      teDescription: descriptionTe,
    });

    const newPost = new Gallery({
      postedBy: user?._id,
      title: { en: titleEn, te: titleTe },
      name: { en: nameEn, te: nameTe },
      description: { en: descriptionEn, te: descriptionTe },
      category: { en: categoryEn, te: categoryTe },
      newsAudio: {
        en: audioFiles.en,
        te: audioFiles.te,
      },
      tags: [
        ...(tagsEn
          ? tagsEn.split(",").map((t) => ({ en: t.trim(), te: "" }))
          : []),
        ...(tagsTe
          ? tagsTe.split(",").map((t) => ({ en: "", te: t.trim() }))
          : []),
      ],
      galleryPics,
      newsId,
    });

    await newPost.save();

    res.status(201).json({
      status: "success",
      message: "Gallery added successfully",
      gallery: newPost,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { galleryId } = req.params;
    const { type } = req.body;
    const userId = req.user.user._id;

    if (!galleryId) {
      return res
        .status(404)
        .send({ status: "fail", message: "Gallery id not found!" });
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

    const gallery = await Gallery.findById(galleryId);
    if (!gallery) {
      return res
        .status(404)
        .send({ status: "fail", message: "Gallery post not found" });
    }

    const existingReactionIndex = gallery.reactions.findIndex(
      (reaction) => reaction.userId.toString() === userId.toString()
    );

    if (existingReactionIndex >= 0) {
      gallery.reactions[existingReactionIndex].type = type;
    } else {
      gallery.reactions.push({ userId, type });
    }

    await gallery.save();

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

export const getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ status: "fail", message: "ID is required" });
    }

    const gallery = await Gallery.findById(id).populate(
      "postedBy",
      "fullName profileUrl _id"
    ); // fetch name & email of uploader

    if (!gallery) {
      return res
        .status(404)
        .json({ status: "fail", message: "Gallery not found" });
    }

    res.status(200).json({ status: "success", data: gallery });
  } catch (error) {
    console.error("Error in getGalleryById:", error.message);
    res.status(500).json({
      status: "fail",
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getGalleryByNewsId = async (req, res) => {
  try {
    const { newsId } = req.params;

    if (!newsId) {
      return res.status(400).json({
        status: "fail",
        message: "newsId parameter is required",
      });
    }

    const post = await Gallery.findOne({ newsId })
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

    const suggestedGallery = await Gallery.aggregate([
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
      message: "Gallery fetched successfully",
      gallery: post,
      suggestedGallery,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching the gallery",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getFilteredGallery = async (req, res) => {
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
        { "tags.en": { $regex: searchText, $options: "i" } },
        { "tags.te": { $regex: searchText, $options: "i" } },
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

    const totalItems = await Gallery.countDocuments(filter);

    const gallery = await Gallery.find(filter)
      .populate("postedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      gallery,
      pagination: {
        currentPage: page,
        perPage: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
      status: "success",
    });
  } catch (error) {
    console.error("Error fetching filtered gallery:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const editGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titleEn,
      titleTe,
      nameEn,
      nameTe,
      descriptionEn,
      descriptionTe,
      categoryEn,
      categoryTe,
      tagsEn,
      tagsTe,
      removedImages, // This will be a JSON string now
    } = req.body;

    const { user } = req.user;

    if (!id) {
      return res
        .status(400)
        .json({ status: "fail", message: "ID is required" });
    }

    // ✅ Parse removedImages from JSON string
    let imagesToRemove = [];
    try {
      if (removedImages) {
        imagesToRemove = JSON.parse(removedImages);
      }
    } catch (parseError) {
      console.error("Error parsing removedImages:", parseError);
      // If parsing fails, try to handle as string or array
      if (typeof removedImages === "string") {
        imagesToRemove = [removedImages];
      } else if (Array.isArray(removedImages)) {
        imagesToRemove = removedImages;
      }
    }

    // Rest of your validation...
    if (
      !titleEn ||
      !titleTe ||
      !nameEn ||
      !nameTe ||
      !descriptionEn ||
      !descriptionTe ||
      !categoryEn ||
      !categoryTe
    ) {
      return res
        .status(400)
        .json({ status: "fail", message: "All fields required!" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    const currentUser = await Users.findById(user?._id);
    if (
      (currentUser.role !== "admin" && currentUser.role !== "writer") ||
      currentUser.isActive === false
    ) {
      return res
        .status(403)
        .json({ status: "fail", message: "You don't have permission!" });
    }

    const gallery = await Gallery.findById(id);
    if (!gallery) {
      return res
        .status(404)
        .json({ status: "fail", message: "Gallery not found!" });
    }

    if (
      gallery.postedBy.toString() !== user._id.toString() &&
      currentUser.role !== "admin"
    ) {
      return res.status(403).json({ status: "fail", message: "Unauthorized!" });
    }

    // ✅ Remove images from gallery
    if (imagesToRemove.length > 0) {
      const originalLength = gallery.galleryPics.length;

      gallery.galleryPics = gallery.galleryPics.filter((img) => {
        const imageUrl = typeof img === "string" ? img : img.url;
        return !imagesToRemove.includes(imageUrl);
      });

      // Delete files from storage
      for (const imgUrl of imagesToRemove) {
        try {
          await deleteFile(imgUrl);
        } catch (err) {
          console.error("Delete error:", err.message);
        }
      }
    }

    // ✅ Upload new files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await uploadFile(file);
          gallery.galleryPics.push(uploadResult.Location);
        } catch (uploadError) {
          console.error("File upload failed:", uploadError.message);
        }
      }
    }

    // ✅ Update text fields
    gallery.title = { en: titleEn, te: titleTe };
    gallery.name = { en: nameEn, te: nameTe };
    gallery.description = { en: descriptionEn, te: descriptionTe };
    gallery.category = { en: categoryEn, te: categoryTe };

    // Handle tags
    const englishTags = tagsEn
      ? tagsEn
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : [];
    const teluguTags = tagsTe
      ? tagsTe
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : [];

    gallery.tags = [
      ...englishTags.map((t) => ({ en: t, te: "" })),
      ...teluguTags.map((t) => ({ en: "", te: t })),
    ];

    // ✅ Regenerate slug if title changed
    if (gallery.title.en !== titleEn) {
      const newsId = await generateUniqueSlug(Gallery, titleEn, id);
      gallery.newsId = newsId;
    }

    if (gallery.newsAudio) {
      gallery.newsAudio.en = null;
      gallery.newsAudio.te = null;
    }

    const audioFiles = await generateAudioForTexts({
      enTitle: titleEn,
      enDescription: descriptionEn,
      teTitle: titleTe,
      teDescription: descriptionTe,
    });

    gallery.newsAudio = audioFiles;

    await gallery.save();

    res.status(200).json({
      status: "success",
      message: "Gallery updated successfully",
      gallery,
    });
  } catch (error) {
    console.error("Edit Gallery Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.user;

    if (!user)
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });

    const currentUser = await Users.findById(user._id);
    if (
      (currentUser.role !== "admin" && currentUser.role !== "writer") ||
      currentUser.isActive === false
    ) {
      return res
        .status(403)
        .json({ status: "fail", message: "You don't have permission!" });
    }

    const gallery = await Gallery.findById(id);
    if (!gallery)
      return res
        .status(404)
        .json({ status: "fail", message: "Gallery not found!" });

    if (
      gallery.postedBy.toString() !== user._id.toString() &&
      currentUser.role !== "admin" &&
      currentUser.role !== "writer"
    ) {
      return res.status(403).json({ status: "fail", message: "Unauthorized!" });
    }

    // ✅ Delete images from S3
    for (const img of gallery.galleryPics) {
      try {
        await deleteFile(img.url);
      } catch (err) {
        console.log("AWS delete error:", err.message);
      }
    }

    await Gallery.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Gallery deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};
