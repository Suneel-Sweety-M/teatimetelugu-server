import { v4 as uuidv4 } from "uuid";
import Home from "../models/homeModel.js";
import News from "../models/newsModel.js";
import Users from "../models/userModel.js";
import Gallery from "../models/galleryModel.js";
import Videos from "../models/videoModel.js";
import mongoose from "mongoose";

export const getDashboardData = async (req, res) => {
  try {
    const newsCount = await News.countDocuments();
    const galleriesCount = await Gallery.countDocuments();
    const videosCount = await Videos.countDocuments();
    const usersCount = await Users.countDocuments();
    const writersCount = await Users.countDocuments({ role: "writer" });
    const adminsCount = await Users.countDocuments({ role: "admin" });

    return res.status(200).json({
      status: "success",
      message: "Data fetched successfully",
      newsCount,
      galleriesCount,
      videosCount,
      usersCount,
      writersCount,
      adminsCount,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const setBreakingNews = async (req, res) => {
  try {
    const { items } = req.body; // [{ news: ObjectId, position: Number }, ...]
    const { user } = req.user;

    // Check user authentication and authorization first
    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    // Allow empty array to clear all breaking news
    if (!items) {
      return res.status(400).json({
        status: "fail",
        message: "Items array is required",
      });
    }

    // Maximum 5 breaking news posts allowed (adjust as needed)
    // if (items.length > 5) {
    //   return res.status(400).json({
    //     status: "fail",
    //     message: "Maximum 5 breaking news posts allowed!",
    //   });
    // }

    // Validate each item has both news ID and position if array is not empty
    if (
      items.length > 0 &&
      !items.every((item) => item.news && typeof item.position === "number")
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Each breaking news item must have a news ID and position",
      });
    }

    // Check for duplicate positions if array is not empty
    if (items.length > 0) {
      const positions = items.map((item) => item.position);
      if (new Set(positions).size !== positions.length) {
        return res.status(400).json({
          status: "fail",
          message: "Duplicate positions found in breaking news items",
        });
      }
    }

    // Convert news IDs to ObjectId
    const formattedItems = items.map((item) => ({
      news: new mongoose.Types.ObjectId(item.news),
      position: item.position,
    }));

    // Find or create assets document
    let homeAssets = await Home.findOne();

    if (!homeAssets) {
      // If no assets exist and we're setting empty array, no need to create
      if (items.length === 0) {
        return res.status(200).json({
          status: "success",
          message: "Breaking news cleared (no existing breaking news)",
        });
      }
      homeAssets = new Assets({ breakingNews: formattedItems });
    } else {
      homeAssets.breakingNews = formattedItems;
    }

    // Save to database
    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message:
        items.length > 0
          ? "Breaking news updated successfully"
          : "Breaking news cleared successfully",
    });
  } catch (error) {
    console.error("Error in setBreakingNews:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export const getBreakingNews = async (req, res) => {
  try {
    // Find assets and populate breaking news with full news details
    const homeAssets = await Home.findOne().populate({
      path: "breakingNews.news",
      populate: { path: "postedBy", select: "fullName profileUrl" },
    });

    // If no assets document exists or breakingNews is empty, return empty array
    if (
      !homeAssets ||
      !homeAssets.breakingNews ||
      homeAssets.breakingNews.length === 0
    ) {
      return res.status(200).json({
        status: "success",
        message: "No breaking news found",
        news: [],
      });
    }

    // Filter out any null/undefined news, sort by position, and map to response format
    const breakingNews = homeAssets.breakingNews
      .filter((item) => item.news) // skip null or undefined news
      .sort((a, b) => a.position - b.position) // sort by position
      .map((item) => ({
        ...item.news.toObject(), // convert to plain JS object
        position: item.position, // include position in response
      }));

    return res.status(200).json({
      status: "success",
      message: "Breaking news fetched successfully",
      news: breakingNews,
    });
  } catch (error) {
    console.error("Error in getBreakingNews:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export const setHomeGrid = async (req, res) => {
  try {
    const { items } = req.body; // [{ news: ObjectId, position: 1 }, ...]
    const { user } = req.user;

    if (!items || items.length !== 5) {
      return res.status(400).json({
        status: "fail",
        message: "Exactly 5 items with positions must be selected!",
      });
    }

    if (!user || (user.role !== "admin" && user.role !== "writer")) {
      return res.status(403).json({ status: "fail", message: "Unauthorized" });
    }

    let homeAssets = await Home.findOne();

    if (!homeAssets) {
      homeAssets = new Home({ topFiveGrid: items });
    } else {
      homeAssets.topFiveGrid = items;
    }

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Grid saved successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const getHomeGrid = async (req, res) => {
  try {
    const homeAssets = await Home.findOne().populate({
      path: "topFiveGrid.news",
      populate: { path: "postedBy", select: "fullName profileUrl" },
    });

    if (!homeAssets) {
      const newHomeAssets = new Assets({ topFiveGrid: [] });
      await newHomeAssets.save();
      return res.status(200).json({
        status: "success",
        message: "No home assets found. Created a new document.",
        topFiveGrid: [],
      });
    }

    const sortedNews = homeAssets.topFiveGrid
      .filter((item) => item.news) // skip null or undefined news
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        ...item.news.toObject(), // safer than _doc
        position: item.position,
      }));

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      news: sortedNews,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const setTopNine = async (req, res) => {
  try {
    const { items } = req.body; // [{ news: ObjectId, position: 1 }, ...]
    const { user } = req.user;

    if (!items || items.length !== 9) {
      return res.status(400).json({
        status: "fail",
        message: "Exactly 9 posts with positions are required!",
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    let homeAssets = await Home.findOne();

    if (!homeAssets) {
      homeAssets = new Assets({ topNine: items });
    } else {
      homeAssets.topNine = items;
    }

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Top 9 updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const getTopNine = async (req, res) => {
  try {
    const homeAssets = await Home.findOne().populate({
      path: "topNine.news",
      populate: { path: "postedBy", select: "fullName profileUrl" },
    });

    if (!homeAssets) {
      const newHomeAssets = new Assets({ topNine: [] });
      await newHomeAssets.save();
      return res.status(200).json({
        status: "success",
        message: "No top 9 found",
        news: [],
      });
    }

    const sortedNews = homeAssets.topNine
      .filter((item) => item.news) // skip null or undefined news
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        ...item.news.toObject(), // safer than _doc
        position: item.position,
      }));

    return res.status(200).json({
      status: "success",
      message: "Top 9 fetched successfully",
      news: sortedNews,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const setTrends = async (req, res) => {
  try {
    const { items } = req.body; // [{ news: ObjectId, position: 1 }, ...]
    const { user } = req.user;

    if (!items || items.length !== 5) {
      return res.status(400).json({
        status: "fail",
        message: "Exactly 5 posts with positions are required!",
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    if (!items.every((item) => item.news && item.position)) {
      return res.status(400).json({
        status: "fail",
        message: "Each trend must have a news ID and position",
      });
    }

    items.forEach((item) => {
      item.news = new mongoose.Types.ObjectId(item.news);
    });

    let homeAssets = await Home.findOne();

    if (!homeAssets) {
      homeAssets = new Home({ trends: items });
    } else {
      homeAssets.trends = items;
    }

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Trends updated successfully",
    });
  } catch (error) {
    console.error("Error in setTrends:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export const getTrends = async (req, res) => {
  try {
    const homeAssets = await Home.findOne().populate({
      path: "trends.news",
      populate: { path: "postedBy", select: "fullName profileUrl" },
    });

    if (!homeAssets) {
      const newHomeAssets = new Assets({ trends: [] });
      await newHomeAssets.save();
      return res.status(200).json({
        status: "success",
        message: "No trends found",
        news: [],
      });
    }

    const sortedNews = homeAssets.trends
      .filter((item) => item.news) // skip null or undefined news
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        ...item.news.toObject(), // safer than _doc
        position: item.position,
      }));

    return res.status(200).json({
      status: "success",
      message: "Trends fetched successfully",
      news: sortedNews,
    });
  } catch (error) {
    console.error("Error in getTrends:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export const setHotTopics = async (req, res) => {
  try {
    const { items } = req.body; // [{ news: ObjectId, position: 1 }, ...]
    const { user } = req.user;

    if (!items || items.length !== 5) {
      return res.status(400).json({
        status: "fail",
        message: "Exactly 5 posts with positions are required!",
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    if (!items.every((item) => item.news && item.position)) {
      return res.status(400).json({
        status: "fail",
        message: "Each hot topic must have a news ID and position",
      });
    }

    items.forEach((item) => {
      item.news = new mongoose.Types.ObjectId(item.news);
    });

    let homeAssets = await Home.findOne();

    if (!homeAssets) {
      homeAssets = new Home({ hotTopics: items });
    } else {
      homeAssets.hotTopics = items;
    }

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Hot Topics updated successfully",
    });
  } catch (error) {
    console.error("Error in setHotTopics:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export const getHotTopics = async (req, res) => {
  try {
    const homeAssets = await Home.findOne().populate({
      path: "hotTopics.news",
      populate: { path: "postedBy", select: "fullName profileUrl" },
    });

    if (!homeAssets) {
      const newHomeAssets = new Assets({ hotTopics: [] });
      await newHomeAssets.save();
      return res.status(200).json({
        status: "success",
        message: "No hot topics found",
        news: [],
      });
    }

    const sortedNews = homeAssets.hotTopics
      .filter((item) => item.news) // skip null or undefined news
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        ...item.news.toObject(), // safer than _doc
        position: item.position,
      }));

    return res.status(200).json({
      status: "success",
      message: "Hot Topics fetched successfully",
      news: sortedNews,
    });
  } catch (error) {
    console.error("Error in getHotTopics:", error);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export const setCategoryTopPosts = async (req, res) => {
  try {
    const { category, posts = [] } = req.body; // Default to empty array if posts not provided
    const { user } = req.user;

    // Validate category exists (but allow empty posts array)
    if (!category) {
      return res.status(400).json({
        status: "fail",
        message: "Category is required",
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    let assets = await Home.findOne();

    if (!assets) {
      assets = new Home({
        categoryTopPosts: [{ category, posts }],
      });
    } else {
      // Find if category already exists
      const existingIndex = assets.categoryTopPosts.findIndex(
        (c) => c.category.toLowerCase() === category.toLowerCase()
      );

      if (existingIndex !== -1) {
        // Set posts to empty array if none provided, or to the provided array
        assets.categoryTopPosts[existingIndex].posts = posts;
      } else {
        assets.categoryTopPosts.push({ category, posts });
      }
    }

    await assets.save();

    return res.status(200).json({
      status: "success",
      message: `Top posts updated successfully for category "${category}"`,
      data: {
        category,
        posts: posts, // Return the posts array that was saved (could be empty)
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const getCategoryTopPosts = async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({
        status: "fail",
        message: "Category query parameter is required!",
      });
    }

    const assets = await Home.findOne().populate({
      path: "categoryTopPosts.posts.news",
      populate: { path: "postedBy", select: "fullName profileUrl" },
    });

    if (!assets) {
      return res.status(200).json({
        status: "success",
        message: "No category top posts found",
        posts: [],
      });
    }

    const categoryData = assets.categoryTopPosts.find(
      (c) => c.category.toLowerCase() === category.toLowerCase()
    );

    if (!categoryData) {
      return res.status(200).json({
        status: "success",
        message: `No posts found for category "${category}"`,
        posts: [],
      });
    }

    const sortedPosts = categoryData.posts
      .filter((item) => item.news)
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        ...item.news.toObject(),
        position: item.position,
      }));

    return res.status(200).json({
      status: "success",
      message: `Top posts for "${category}" fetched successfully`,
      posts: sortedPosts,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

//========== Movie Releases and Collections ==========

export const addMovieReleases = async (req, res) => {
  try {
    const { movie, date, category } = req.body;
    const { user } = req.user;

    if (!movie || !movie.en || !movie.te) {
      return res
        .status(400)
        .json({ status: "fail", message: "Add movie name in both languages!" });
    }

    if (!date || !date.en || !date.te) {
      return res.status(400).json({
        status: "fail",
        message: "Add release date in both languages!",
      });
    }

    if (!category || !category.en || !category.te) {
      return res
        .status(400)
        .json({ status: "fail", message: "Add category in both languages!" });
    }

    if (!user) {
      return res
        .status(401)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    // Find or create Home document
    let homeData = await Home.findOne();

    const newRelease = {
      movie,
      date,
      category,
    };

    if (!homeData) {
      // Create new Home document if it doesn't exist
      homeData = new Home({
        movieReleases: [newRelease],
      });
    } else {
      // Add to existing movieReleases array
      homeData.movieReleases.push(newRelease);
    }

    await homeData.save();

    return res.status(200).json({
      status: "success",
      message: "Movie release added successfully",
    });
  } catch (error) {
    console.error("Error adding movie release:", error);
    return res
      .status(500)
      .json({ status: "fail", message: "Internal server error" });
  }
};

export const getMovieReleases = async (req, res) => {
  try {
    const assets = await Home.findOne({}, "movieReleases");

    if (!assets || !assets.movieReleases) {
      return res
        .status(404)
        .json({ status: "fail", message: "No data found!" });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      movieReleases: assets.movieReleases.slice().reverse(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const editMovieRelease = async (req, res) => {
  try {
    const { movie, date, category, id } = req.body;
    const { user } = req.user;

    if (!movie && !date && !category) {
      return res
        .status(400)
        .json({ status: "fail", message: "Nothing to update!" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    const homeAssets = await Home.findOne();

    if (!homeAssets) {
      return res
        .status(404)
        .json({ status: "fail", message: "Assets not found!" });
    }

    const movieRelease = homeAssets.movieReleases.find(
      (release) => release.id.toString() === id.toString()
    );

    if (!movieRelease) {
      return res
        .status(404)
        .json({ status: "fail", message: "Movie release not found!" });
    }

    // Update fields if they are provided
    if (movie) movieRelease.movie = movie;
    if (date) movieRelease.date = date;
    if (category) movieRelease.category = category;

    homeAssets.markModified("movieReleases");

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const deleteMovieRelease = async (req, res) => {
  try {
    const { user } = req.user;
    const { id } = req.params;

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    const homeAssets = await Home.findOne();

    if (!homeAssets) {
      return res
        .status(404)
        .json({ status: "fail", message: "Assets not found!" });
    }

    const initialLength = homeAssets.movieReleases.length;
    homeAssets.movieReleases = homeAssets.movieReleases.filter(
      (release) => release.id.toString() !== id.toString()
    );

    if (homeAssets.movieReleases.length === initialLength) {
      return res
        .status(404)
        .json({ status: "fail", message: "Movie release not found!" });
    }

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const addMovieCollections = async (req, res) => {
  try {
    const { movie, category, amount } = req.body;
    const { user } = req.user;

    if (!movie || !movie.en || !movie.te) {
      return res
        .status(404)
        .json({ status: "fail", message: "Add movie name!" });
    }

    if (!amount) {
      return res
        .status(404)
        .json({ status: "fail", message: "Add release amount!" });
    }

    if (!category || !category.en || !category.te) {
      return res.status(404).json({ status: "fail", message: "Add category!" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    let homeAssets = await Home.findOne();

    const newRelease = {
      id: uuidv4(),
      movie: movie,
      amount,
      category: category,
    };

    if (!homeAssets) {
      homeAssets = new Assets({
        movieCollections: [newRelease],
      });
    } else {
      homeAssets.movieCollections = [
        ...homeAssets.movieCollections,
        newRelease,
      ];
    }

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Added successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const getMovieCollections = async (req, res) => {
  try {
    const assets = await Home.findOne({}, "movieCollections");

    if (!assets || !assets.movieCollections) {
      return res
        .status(404)
        .json({ status: "fail", message: "No data found!" });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      movieCollections: assets.movieCollections.slice().reverse(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const editMovieCollection = async (req, res) => {
  try {
    const { movie, amount, category, id } = req.body;
    const { user } = req.user;

    if (!movie && !amount && !category) {
      return res
        .status(400)
        .json({ status: "fail", message: "Nothing to update!" });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    const homeAssets = await Home.findOne();

    if (!homeAssets) {
      return res
        .status(404)
        .json({ status: "fail", message: "Assets not found!" });
    }

    const movieCollection = homeAssets.movieCollections.find(
      (release) => release.id.toString() === id.toString()
    );

    if (!movieCollection) {
      return res
        .status(404)
        .json({ status: "fail", message: "Movie release not found!" });
    }

    // Update fields if they are provided
    if (movie) movieCollection.movie = movie;
    if (amount) movieCollection.amount = amount;
    if (category) movieCollection.category = category;

    homeAssets.markModified("movieCollections");

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

export const deleteMovieCollection = async (req, res) => {
  try {
    const { user } = req.user;
    const { id } = req.params;

    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found!" });
    }

    if (user.role !== "admin" && user.role !== "writer") {
      return res
        .status(403)
        .json({ status: "fail", message: "Unauthorized action!" });
    }

    const homeAssets = await Home.findOne();

    if (!homeAssets) {
      return res
        .status(404)
        .json({ status: "fail", message: "Assets not found!" });
    }

    const initialLength = homeAssets.movieCollections.length;

    homeAssets.movieCollections = homeAssets.movieCollections.filter(
      (collection) => collection.id.toString() !== id.toString()
    );

    if (homeAssets.movieCollections.length === initialLength) {
      return res
        .status(404)
        .json({ status: "fail", message: "Movie collection not found!" });
    }

    await homeAssets.save();

    return res.status(200).json({
      status: "success",
      message: "Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

//================ POSTERS AND ADS ==============

export const getPopupPoster = async (req, res) => {
  try {
    const assets = await Home.find({}, "posters");

    if (!assets || assets.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    const { popupPoster } = assets[0].posters;

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      popupPoster,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setPopupPoster = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "posters.popupPoster": { img, link } } },
      { new: true }
    );

    if (!updatedAsset) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found to update!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Popup poster updated successfully!",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const getMoviePoster = async (req, res) => {
  try {
    const assets = await Home.find({}, "posters");

    if (!assets || assets.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    const { moviePoster } = assets[0].posters;

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      moviePoster,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setMoviePoster = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "posters.moviePoster": { img, link } } },
      { new: true }
    );

    if (!updatedAsset) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found to update!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Movie poster updated successfully!",
      data: updatedAsset.posters.moviePoster,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const getNavbarAd = async (req, res) => {
  try {
    const assets = await Home.find({}, "posters");

    if (!assets || assets?.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    const { navbarAd } = assets[0].posters;

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      navbarAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setNavbarAd = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "posters.navbarAd": { img, link } } },
      { new: true }
    );

    if (!updatedAsset) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found to update!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Ad updated successfully!",
      data: updatedAsset?.posters?.navbarAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

// Getter and Setter for Home Long Ad
export const getHomeLongAd = async (req, res) => {
  try {
    const assets = await Home.findOne({}, "ads.homeLongAd");

    if (!assets) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      homeLongAd: assets.ads?.homeLongAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setHomeLongAd = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "ads.homeLongAd": { img, link } } },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Home Long Ad updated successfully!",
      data: updatedAsset.ads?.homeLongAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

// Getter and Setter for Home Short Ad
export const getHomeShortAd = async (req, res) => {
  try {
    const assets = await Home.findOne({}, "ads.homeShortAd");

    if (!assets) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      homeShortAd: assets.ads?.homeShortAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setHomeShortAd = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "ads.homeShortAd": { img, link } } },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Home Short Ad updated successfully!",
      data: updatedAsset.ads?.homeShortAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

// Getter and Setter for Category Long Ad
export const getCategoryLongAd = async (req, res) => {
  try {
    const assets = await Home.findOne({}, "ads.categoryLongAd");

    if (!assets) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      categoryLongAd: assets.ads?.categoryLongAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setCategoryLongAd = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "ads.categoryLongAd": { img, link } } },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Category Long Ad updated successfully!",
      data: updatedAsset.ads?.categoryLongAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

// Getter and Setter for Category Short Ad
export const getCategoryShortAd = async (req, res) => {
  try {
    const assets = await Home.findOne({}, "ads.categoryShortAd");

    if (!assets) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      categoryShortAd: assets.ads?.categoryShortAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setCategoryShortAd = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "ads.categoryShortAd": { img, link } } },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: "success",
      message: "Category Short Ad updated successfully!",
      data: updatedAsset.ads?.categoryShortAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

// Getter and Setter for News Long Ad
export const getNewsLongAd = async (req, res) => {
  try {
    const assets = await Home.findOne({}, "ads.newsLongAd");

    if (!assets) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      newsLongAd: assets.ads?.newsLongAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setNewsLongAd = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "ads.newsLongAd": { img, link } } },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: "success",
      message: "News Long Ad updated successfully!",
      data: updatedAsset.ads?.newsLongAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

// Getter and Setter for News Short Ad
export const getNewsShortAd = async (req, res) => {
  try {
    const assets = await Home.findOne({}, "ads.newsShortAd");

    if (!assets) {
      return res.status(404).json({
        status: "fail",
        message: "No assets found!",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetched successfully",
      newsShortAd: assets.ads?.newsShortAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

export const setNewsShortAd = async (req, res) => {
  try {
    const { img, link } = req.body;

    const updatedAsset = await Home.findOneAndUpdate(
      {},
      { $set: { "ads.newsShortAd": { img, link } } },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: "success",
      message: "News Short Ad updated successfully!",
      data: updatedAsset.ads?.newsShortAd,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: "Server Error!",
    });
  }
};

//=========== SEARCH ===========
export const getSearchedNews = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const skip = Number(req.query.skip) || 0;
    const limit = Number(req.query.limit) || 9;

    if (!searchTerm) {
      return res.status(400).json({
        status: "fail",
        message: "Search term is required.",
      });
    }

    // Search in both English & Telugu fields
    const newsQuery = {
      $or: [
        { "title.en": { $regex: searchTerm, $options: "i" } },
        { "title.te": { $regex: searchTerm, $options: "i" } },
        { "description.en": { $regex: searchTerm, $options: "i" } },
        { "description.te": { $regex: searchTerm, $options: "i" } },
        { "category.en": { $regex: searchTerm, $options: "i" } },
        { "category.te": { $regex: searchTerm, $options: "i" } },
        { "subCategory.en": { $regex: searchTerm, $options: "i" } },
        { "subCategory.te": { $regex: searchTerm, $options: "i" } },
        { "tags.en": { $regex: searchTerm, $options: "i" } },
        { "tags.te": { $regex: searchTerm, $options: "i" } },
      ],
    };

    // Fetch News items
    const allNews = await News.find(newsQuery).sort({ createdAt: -1 });

    // Categories (based on English category field as default)
    const categories = [
      "news",
      "politics",
      "movies",
      "ott",
      "gossips",
      "reviews",
      "collections",
      "shows",
    ];
    const categorizedNews = {};
    categories.forEach((c) => {
      categorizedNews[c] = [];
    });

    allNews.forEach((article) => {
      const cat = article.category?.en?.toLowerCase() || "news";
      if (categorizedNews[cat]) {
        categorizedNews[cat].push(article);
      } else {
        categorizedNews.news.push(article); // default fallback
      }
    });

    // Paginate each category
    const paginatedNews = {};
    categories.forEach((cat) => {
      const total = categorizedNews[cat].length;
      const items = categorizedNews[cat].slice(skip, skip + limit);
      paginatedNews[cat] = { items, total };
    });

    // Fetch gallery and videos with same en/te search
    const [galleryResults, videoResults, galleryCount, videoCount] =
      await Promise.all([
        Gallery.find({
          $or: [
            { "title.en": { $regex: searchTerm, $options: "i" } },
            { "title.te": { $regex: searchTerm, $options: "i" } },
            { "description.en": { $regex: searchTerm, $options: "i" } },
            { "description.te": { $regex: searchTerm, $options: "i" } },
            { "category.en": { $regex: searchTerm, $options: "i" } },
            { "category.te": { $regex: searchTerm, $options: "i" } },
          ],
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Videos.find({
          $or: [
            { "title.en": { $regex: searchTerm, $options: "i" } },
            { "title.te": { $regex: searchTerm, $options: "i" } },
            { "description.en": { $regex: searchTerm, $options: "i" } },
            { "description.te": { $regex: searchTerm, $options: "i" } },
            { "category.en": { $regex: searchTerm, $options: "i" } },
            { "category.te": { $regex: searchTerm, $options: "i" } },
          ],
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Gallery.countDocuments({
          $or: [
            { "title.en": { $regex: searchTerm, $options: "i" } },
            { "title.te": { $regex: searchTerm, $options: "i" } },
            { "description.en": { $regex: searchTerm, $options: "i" } },
            { "description.te": { $regex: searchTerm, $options: "i" } },
          ],
        }),
        Videos.countDocuments({
          $or: [
            { "title.en": { $regex: searchTerm, $options: "i" } },
            { "title.te": { $regex: searchTerm, $options: "i" } },
            { "description.en": { $regex: searchTerm, $options: "i" } },
            { "description.te": { $regex: searchTerm, $options: "i" } },
          ],
        }),
      ]);

    return res.status(200).json({
      status: "success",
      data: {
        ...paginatedNews,
        gallery: { items: galleryResults, total: galleryCount },
        videos: { items: videoResults, total: videoCount },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
