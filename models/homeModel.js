import mongoose, { Schema } from "mongoose";

const homeSchema = new mongoose.Schema(
  {
    breakingNews: [ 
      {
        news: {
          type: Schema.Types.ObjectId,
          ref: "News",
        },
        position: Number,
      },
    ],
    trends: [
      {
        news: {
          type: Schema.Types.ObjectId,
          ref: "News",
        },
        position: Number, // 1 to 5
      },
    ],
    topFiveGrid: [
      {
        news: {
          type: Schema.Types.ObjectId,
          ref: "News",
        },
        position: Number, // 1 to 5
      },
    ],
    hotTopics: [
      {
        news: {
          type: Schema.Types.ObjectId,
          ref: "News",
        },
        position: Number,
      },
    ],
    topNine: [
      {
        news: {
          type: Schema.Types.ObjectId,
          ref: "News",
        },
        position: Number, // 1–9
      },
    ],
    categoryTopPosts: [
      {
        category: {
          type: String,
          required: true,
          trim: true,
        },
        posts: [
          {
            news: {
              type: Schema.Types.ObjectId,
              ref: "News",
            },
            position: Number, // 1 to 5
          },
        ],
      },
    ],
    filesLinks: [
      {
        type: String,
      },
    ],
    movieReleases: [
      {
        movie: {
          en: { type: String, required: true },
          te: { type: String, required: true },
        },
        date: {
          en: { type: String, required: true },
          te: { type: String, required: true },
        },
        category: {
          en: { type: String, required: true },
          te: { type: String, required: true },
        },
      },
    ],
    movieCollections: [
      {
        movie: {
          en: { type: String, required: true },
          te: { type: String, required: true },
        },
        amount: {
          en: { type: String, required: true }, // e.g., "100 Crores"
          te: { type: String, required: true }, // e.g., "100 కోట్లు"
        },
        category: {
          en: { type: String, required: true },
          te: { type: String, required: true },
        },
      },
    ],
    posters: {
      popupPoster: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
      },
      moviePoster: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
      },
      navbarAd: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
      },
    },
    ads: {
      homeLongAd: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
      homeShortAd: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
      categoryLongAd: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
      categoryShortAd: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
      newsLongAd: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
      newsShortAd: {
        img: {
          type: String,
          default: "",
        },
        link: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    },
  },
  { timestamps: true, default: 0 }
);

const Home = mongoose.model("Home", homeSchema);

export default Home;
