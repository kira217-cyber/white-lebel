import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
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

const MyGpCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: LangTextSchema,
      required: true,
    },

    categoryTitle: {
      type: LangTextSchema,
      required: true,
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

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("MyGpCategory", MyGpCategorySchema);