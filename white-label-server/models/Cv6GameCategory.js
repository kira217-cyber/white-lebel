import mongoose from "mongoose";

const LangTextSchema = new mongoose.Schema(
  {
    bn: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false },
);

// Optional text — empty falls back to something else on the site.
const OptionalTextSchema = new mongoose.Schema(
  {
    bn: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false },
);

/**
 * CV666 — one category drives both designs of the site:
 *   desktop  header nav item (25px icon) + "provider list" card on home
 *            (banner + provider logos) + "hot recommended" section + game center
 *   mobile   tab in the grey category bar + game center
 * so every visual the two designs need lives here, uploaded once.
 */
const Cv6GameCategorySchema = new mongoose.Schema(
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

    // The mobile tab often has a shorter name (desktop "ক্যাসিনো", mobile
    // "লাইভ"). Empty → `name`.
    mobName: {
      type: OptionalTextSchema,
      default: () => ({}),
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

    // Desktop home "provider list": a big card (2 per row) or a small one
    // (3 in the white strip below), with this banner and the first four
    // providers' colour logos. "none" = not on the list.
    homeCard: {
      type: String,
      enum: ["none", "large", "small"],
      default: "none",
    },
    homeBanner: { type: String, default: "", trim: true },
    homeCardOrder: { type: Number, default: 0, min: 0 },

    // Desktop home "<x> জন্য সবচেয়ে হট সুপারিশ" — this category's HOT games.
    showHotSection: { type: Boolean, default: false },
    hotTitle: {
      type: OptionalTextSchema,
      default: () => ({}),
    },

    // ডেস্কটপের খেলার কেন্দ্র (`/games/<key>`): "grid" = খোঁজ + প্রোভাইডারের সারি +
    // গেমের গ্রিড (স্লট, ফিশিং); "providers" = প্রোভাইডারের বড় কার্ড (ক্যাসিনো, স্পোর্টস)
    centerLayout: { type: String, enum: ["grid", "providers"], default: "grid" },
    // খেলার কেন্দ্রের পুরো প্রস্থের পটভূমি (১৯২০ চওড়া)
    centerBg: { type: String, default: "", trim: true },

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

Cv6GameCategorySchema.index({ status: 1, order: 1 });

const Cv6GameCategory =
  mongoose.models.Cv6GameCategory ||
  mongoose.model("Cv6GameCategory", Cv6GameCategorySchema);

export default Cv6GameCategory;
