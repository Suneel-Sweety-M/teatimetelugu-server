import express from "express";
import multer from "multer";
import {
  addMovieCollections,
  addMovieReleases,
  deleteMovieCollection,
  deleteMovieRelease,
  editMovieCollection,
  editMovieRelease,
  getBreakingNews,
  getCategoryLongAd,
  getCategoryShortAd,
  getCategoryTopPosts,
  getDashboardData,
  getHomeGrid,
  getHomeLongAd,
  getHomeShortAd,
  getHotTopics,
  getMovieCollections,
  getMoviePoster,
  getMovieReleases,
  getNavbarAd,
  getNewsLongAd,
  getNewsShortAd,
  getPopupPoster,
  getSearchedNews,
  getTopNine,
  getTrends,
  setBreakingNews,
  setCategoryLongAd,
  setCategoryShortAd,
  setCategoryTopPosts,
  setHomeGrid,
  setHomeLongAd,
  setHomeShortAd,
  setHotTopics,
  setMoviePoster,
  setNavbarAd,
  setNewsLongAd,
  setNewsShortAd,
  setPopupPoster,
  setTopNine,
  setTrends,
} from "../controllers/homeController.js";
import { userAuth } from "../middlewares/jwt.js";

const router = express.Router();

router.get("/data", getDashboardData);
router.get("/search", getSearchedNews);
router.get("/get-featured-posts", getHomeGrid);
router.get("/get-breaking-news", getBreakingNews);
router.get("/get-trends", getTrends);
router.get("/get-top-nine", getTopNine);
router.get("/get-hot-topics", getHotTopics);
router.get("/get-category-top", getCategoryTopPosts);

router.put("/set-featured-posts", userAuth, setHomeGrid);
router.put("/set-breaking-news", userAuth, setBreakingNews);
router.put("/set-trends", userAuth, setTrends);
router.post("/set-top-nine", userAuth, setTopNine);
router.post("/set-hot-topics", userAuth, setHotTopics);
router.post("/set-category-top", userAuth, setCategoryTopPosts);

// ============= MOVIE RELEASES AND COLLECTIONS ==============
router.get("/get-movie-releases", getMovieReleases);
router.get("/get-movie-collections", getMovieCollections);

router.post("/add-movie-releases", userAuth, addMovieReleases);
router.post("/add-movie-collections", userAuth, addMovieCollections);

router.put("/edit-movie-release", userAuth, editMovieRelease);
router.put("/edit-movie-collection", userAuth, editMovieCollection);

router.delete("/delete-movie-release/:id", userAuth, deleteMovieRelease);
router.delete("/delete-movie-collection/:id", userAuth, deleteMovieCollection);

// =============== POSTERS AND ADS ====================
router.get("/get-popup-poster", getPopupPoster);
router.post("/set-popup-poster", setPopupPoster);
router.get("/get-movie-poster", getMoviePoster);
router.post("/set-movie-poster", setMoviePoster);
router.get("/get-navbar-ad", getNavbarAd);
router.post("/set-navbar-ad", setNavbarAd);
// Home Ads
router.get("/get-home-long-ad", getHomeLongAd);
router.post("/set-home-long-ad", setHomeLongAd);
router.get("/get-home-short-ad", getHomeShortAd);
router.post("/set-home-short-ad", setHomeShortAd);
// Category Ads
router.get("/get-category-long-ad", getCategoryLongAd);
router.post("/set-category-long-ad", setCategoryLongAd);
router.get("/get-category-short-ad", getCategoryShortAd);
router.post("/set-category-short-ad", setCategoryShortAd);
// News Ads
router.get("/get-news-long-ad", getNewsLongAd);
router.post("/set-news-long-ad", setNewsLongAd);
router.get("/get-news-short-ad", getNewsShortAd);
router.post("/set-news-short-ad", setNewsShortAd);

export default router;
