import Videos from "../models/videoModel.js";
import { generateUniqueSlug } from "../utils/generateUniqueSlug.js";

export const addVideo = async (req, res) => {
  try {
    const { title, ytId, subCategory } = req.body;

    if (!title.en || !title.te || !ytId) {
      return res.status(400).json({
        status: "fail",
        message: "English & Telugu Titles and YouTube ID are required!",
      });
    }

    const newsId = await generateUniqueSlug(Videos, title.en);

    const newVideo = new Videos({
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
    if (!id) {
      return res.status(400).json({
        status: "fail",
        message: "Video ID is required",
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
    const {
      category,
      subCategory,
      searchText,
      writer,
      cursor,
      direction = "next",
      limit = 10,
    } = req.query;

    let query = {};

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (writer) query.postedBy = writer;

    if (searchText) {
      query.$or = [
        { title: { $regex: searchText, $options: "i" } },
        { description: { $regex: searchText, $options: "i" } },
        { titleTelugu: { $regex: searchText, $options: "i" } },
        { descriptionTelugu: { $regex: searchText, $options: "i" } },
      ];
    }

    let sortQuery = { createdAt: -1 }; // newest first

    // cursor-based pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (direction === "next") {
        query.createdAt = { $lt: cursorDate };
      } else {
        query.createdAt = { $gt: cursorDate };
        sortQuery = { createdAt: 1 }; // reverse for prev
      }
    }

    let videos = await Videos.find(query)
      .sort(sortQuery)
      .limit(Number(limit) + 1);

    let hasNextPage = false;
    let hasPrevPage = false;

    if (videos.length > Number(limit)) {
      hasNextPage = true;
      videos = videos.slice(0, Number(limit));
    }

    if (cursor) {
      hasPrevPage = true;
    }

    if (direction === "prev") {
      videos = videos.reverse();
    }

    const nextCursor =
      videos.length > 0 ? videos[videos.length - 1].createdAt : null;
    const prevCursor = videos.length > 0 ? videos[0].createdAt : null;

    res.status(200).json({
      status: "success",
      results: videos.length,
      data: videos,
      pageInfo: {
        hasNextPage,
        hasPrevPage,
        nextCursor,
        prevCursor,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
