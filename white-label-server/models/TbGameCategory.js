import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false },
);

/**
 * TBAJEE38 — one category drives both designs of the site:
 *   desktop  category bar + home section (title icon) + game center
 *   mobile   icon row + home section panel + game center
 * so every visual the two designs need lives here, uploaded once.
 */
const TbGameCategorySchema = new mongoose.Schema(
  {
    // URL slug on the site: /games/<key>. Lowercase, unique.
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    name: {
      type: LangTextSchema,
      required: true,
    },

    // games    — normal category, games come from its own providers
    // hot      — every game flagged HOT, in Hot Games order
    // favorite — the player's own list (kept on the site, not here)
    // provider — shortcut to one provider across all categories (JILI tab)
    // sports   — opens its single sports game directly
    type: {
      type: String,
      enum: ["games", "hot", "favorite", "provider", "sports"],
      default: "games",
    },

    // Only for type "provider".
    providerCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    deskIcon: { type: String, default: "", trim: true },
    mobIcon: { type: String, default: "", trim: true },
    titleIcon: { type: String, default: "", trim: true },

    // Drawn size of the desktop tab icon inside its 60px box. The main
    // site sizes each icon on its own (hot 57×65, fav 52×44…); 0 = fit 60.
    deskIconW: { type: Number, default: 0, min: 0, max: 120 },
    deskIconH: { type: Number, default: 0, min: 0, max: 120 },

    showOnDesktop: { type: Boolean, default: true },
    showOnMobile: { type: Boolean, default: true },
    // Home sections: desktop and mobile differ on the main site (mobile has
    // a JILI and a Sports section, desktop does not).
    showOnHome: { type: Boolean, default: true },
    showOnHomeMobile: { type: Boolean, default: true },

    // Provider chips / column on the site. Off for sections that mix
    // providers without letting the player pick (main site's Crash Games).
    showProviders: { type: Boolean, default: true },

    // The desktop tab bar has its own order on the main site (Sports before
    // Crash Games), so it is kept separate from `order` (mobile + sections).
    deskOrder: {
      type: Number,
      default: 0,
      min: 0,
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

TbGameCategorySchema.index({ status: 1, order: 1 });

const TbGameCategory =
  mongoose.models.TbGameCategory ||
  mongoose.model("TbGameCategory", TbGameCategorySchema);

export default TbGameCategory;
