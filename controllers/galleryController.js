import Gallery from "../models/galleryModel.js";
import Users from "../models/userModel.js";
import { uploadFile, deleteFile } from "../utils/s3Service.js";
import { generateUniqueSlug } from "../utils/generateUniqueSlug.js";

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
      (currentUser.role === "admin" || currentUser.role === "writer") &&
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

    const newPost = new Gallery({
      postedBy: user?._id,
      title: { en: titleEn, te: titleTe },
      name: { en: nameEn, te: nameTe },
      description: { en: descriptionEn, te: descriptionTe },
      category: { en: categoryEn, te: categoryTe },
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

export const getFilteredGallery = async (req, res) => {
  try {
    const { category, time, searchText, page = 1, limit = 10 } = req.query;

    let query = Gallery.find();

    // Filter by category
    if (category) {
      query = query.where("category").equals(category);
    }

    // Filter by time
    if (time) {
      const now = new Date();
      let startDate;

      switch (time) {
        case "last24h":
          startDate = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case "last1week":
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case "last1month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "last6months":
          startDate = new Date(now.setMonth(now.getMonth() - 6));
          break;
        case "above6months":
          startDate = new Date(now.setMonth(now.getMonth() - 6));
          query = query.where("createdAt").lt(startDate);
          break;
      }

      if (time !== "above6months" && startDate) {
        query = query.where("createdAt").gte(startDate);
      }
    }

    // Search by title or name
    if (searchText) {
      query = query.find({
        $or: [
          { title: { $regex: searchText, $options: "i" } },
          { name: { $regex: searchText, $options: "i" } },
        ],
      });
    }

    // Count total docs (for frontend pagination info)
    const totalItems = await Gallery.countDocuments(query.getFilter());

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const gallery = await query
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      status: "success",
      gallery,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "fail",
      message: "Error while fetching galleries",
    });
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

    console.log("Parsed images to remove:", imagesToRemove);

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
      (currentUser.role === "admin" || currentUser.role === "writer") &&
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

      console.log(
        `Removed ${originalLength - gallery.galleryPics.length} images`
      );

      // Delete files from storage
      for (const imgUrl of imagesToRemove) {
        try {
          console.log("Attempting to delete:", imgUrl);
          await deleteFile(imgUrl);
          console.log("Successfully deleted:", imgUrl);
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
      (currentUser.role === "admin" || currentUser.role === "writer") &&
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
