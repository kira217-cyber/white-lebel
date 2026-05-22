import mongoose from "mongoose";

const langTextSchema = new mongoose.Schema(
  {
    bn: {
      type: String,
      default: "",
      trim: true,
    },

    en: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const masterRBGameCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: langTextSchema,
      required: true,
    },

    categoryTitle: {
      type: langTextSchema,
      required: true,
    },

    bannerImage: {
      type: String,
      default: "",
      trim: true,
    },

    iconImage: {
      type: String,
      default: "",
      trim: true,
    },

    order: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    jackpot: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    syncStatus: {
      type: String,
      enum: ["pending", "synced", "failed"],
      default: "pending",
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

masterRBGameCategorySchema.index({
  "categoryName.bn": "text",
  "categoryName.en": "text",
  "categoryTitle.bn": "text",
  "categoryTitle.en": "text",
});

const MasterRBGameCategory = mongoose.model(
  "MasterRBGameCategory",
  masterRBGameCategorySchema,
);

export default MasterRBGameCategory;
