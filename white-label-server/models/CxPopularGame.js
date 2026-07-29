import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const CxPopularGameSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    gameTitle: {
      type: LangTextSchema,
      required: true,
    },

    image: {
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

CxPopularGameSchema.index({ status: 1, order: 1 });

const CxPopularGame =
  mongoose.models.CxPopularGame ||
  mongoose.model("CxPopularGame", CxPopularGameSchema);

export default CxPopularGame;