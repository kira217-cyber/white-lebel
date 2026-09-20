import BcGame from "../models/BcGame.js";
import BcGameProvider from "../models/BcGameProvider.js";

/**
 * Deactivating a provider pulls everything it owns off the site. Games keep
 * their own `status` untouched, so reactivating the provider brings them all
 * back exactly as they were — visibility is decided at read time instead.
 */
export const getActiveProviderIds = () =>
  BcGameProvider.find({ status: "active" }).distinct("_id");

export const isActiveProviderId = (activeProviderIds = [], providerDbId = "") =>
  activeProviderIds.some((id) => String(id) === String(providerDbId));

// Ids of games sitting behind a deactivated (or deleted) provider. Hot and
// popular entries pointing at one of these must not reach the site either.
export const getHiddenGameIds = async () => {
  const activeProviderIds = await getActiveProviderIds();

  const hiddenGames = await BcGame.find({
    providerDbId: { $nin: activeProviderIds },
  }).select("_id");

  return new Set(hiddenGames.map((game) => String(game._id)));
};

// Hot/popular rows carry a raw gameId string; entries with no matching BcGame
// at all are left alone, only the explicitly hidden ones are dropped.
export const rejectHiddenEntries = (entries = [], hiddenGameIds = new Set()) =>
  entries.filter((entry) => !hiddenGameIds.has(String(entry?.gameId || "")));
