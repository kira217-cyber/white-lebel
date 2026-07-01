import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const CxGameCategorySchema = new mongoose.Schema(
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
  { timestamps: true },
);

CxGameCategorySchema.index({ status: 1, order: 1 });

const CxGameCategory =
  mongoose.models.CxGameCategory ||
  mongoose.model("CxGameCategory", CxGameCategorySchema);

export default CxGameCategory;
