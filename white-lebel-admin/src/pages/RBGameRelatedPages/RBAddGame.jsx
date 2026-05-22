import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Edit,
  Flame,
  Gamepad2,
  ImagePlus,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL;
const ORACLE_BASE = "https://api.oraclegames.live/api";
const ORACLE_KEY = import.meta.env.VITE_ORACLE_TOKEN;

const GAMES_PER_PAGE = 50;

const initialAddFlags = {
  image: null,
  isHot: false,
  isNew: false,
  isJackpot: false,
  status: "active",
};

const initialEditFlags = {
  image: null,
  isHot: false,
  isNew: false,
  isJackpot: false,
  status: "active",
};

const fileUrl = (path = "") => {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? path : `/${path}`}`;
};

const RBAddGame = () => {
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProviderDbId, setSelectedProviderDbId] = useState("");

  const [providerGames, setProviderGames] = useState([]);
  const [selectedGames, setSelectedGames] = useState([]);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingSelectedGames, setLoadingSelectedGames] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [searchGame, setSearchGame] = useState("");

  const [form, setForm] = useState(initialAddFlags);
  const [imagePreview, setImagePreview] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [editForm, setEditForm] = useState(initialEditFlags);
  const [editPreview, setEditPreview] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((item) => item._id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const selectedProvider = useMemo(
    () => providers.find((item) => item._id === selectedProviderDbId),
    [providers, selectedProviderDbId]
  );

  const selectedCategoryName = selectedCategory?.categoryName?.en || "";
  const selectedProviderName = selectedProvider?.providerName || "";

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-cyan-300/60";
  const labelClass = "mb-2 block text-sm font-bold text-slate-200";

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);

      const res = await api.get("/api/master/rb-game-categories", {
        params: {
          limit: 200,
          status: "active",
        },
      });

      setCategories(res.data?.data?.categories || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadProviders = async (categoryId) => {
    if (!categoryId) {
      setProviders([]);
      setSelectedProviderDbId("");
      return;
    }

    try {
      setLoadingProviders(true);

      const res = await api.get("/api/master/rb-game-providers", {
        params: {
          categoryId,
          limit: 200,
          status: "active",
        },
      });

      setProviders(res.data?.data?.providers || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load providers");
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadSelectedGames = async (providerDbId = selectedProviderDbId) => {
    if (!providerDbId) {
      setSelectedGames([]);
      return;
    }

    try {
      setLoadingSelectedGames(true);

      const res = await api.get("/api/master/rb-games", {
        params: {
          providerDbId,
          limit: 10000,
        },
      });

      setSelectedGames(res.data?.data?.games || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load selected games"
      );
    } finally {
      setLoadingSelectedGames(false);
    }
  };

  const loadOracleGames = async () => {
    if (!selectedProvider?.providerId) {
      setProviderGames([]);
      setCurrentPage(1);
      return;
    }

    try {
      setLoadingGames(true);

      const res = await axios.get(
        `${ORACLE_BASE}/providers/${selectedProvider.providerId}`,
        {
          headers: {
            "x-api-key": ORACLE_KEY,
          },
        }
      );

      setProviderGames(res.data?.games || []);
      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load Oracle games"
      );
      setProviderGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProviders(selectedCategoryId);
  }, [selectedCategoryId]);

  useEffect(() => {
    loadSelectedGames(selectedProviderDbId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProviderDbId]);

  useEffect(() => {
    loadOracleGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider?.providerId]);

  useEffect(() => {
    if (!form.image) {
      setImagePreview("");
      return;
    }

    const url = URL.createObjectURL(form.image);
    setImagePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  useEffect(() => {
    if (!editForm.image) return;

    const url = URL.createObjectURL(editForm.image);
    setEditPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [editForm.image]);

  const resetAddForm = () => {
    setForm(initialAddFlags);
    setImagePreview("");
  };

  const filteredOracleGames = useMemo(() => {
    const q = searchGame.trim().toLowerCase();

    if (!q) return providerGames;

    return providerGames.filter((game) => {
      const name = String(game?.gameName || game?.name || "").toLowerCase();
      const gameId = String(game?._id || "").toLowerCase();
      const code = String(game?.game_code || "").toLowerCase();

      return name.includes(q) || gameId.includes(q) || code.includes(q);
    });
  }, [providerGames, searchGame]);

  const totalPages = Math.ceil(filteredOracleGames.length / GAMES_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const endIndex = startIndex + GAMES_PER_PAGE;
  const paginatedGames = filteredOracleGames.slice(startIndex, endIndex);

  const isGameSelected = (oracleGameId) => {
    return selectedGames.some((item) => String(item.gameId) === String(oracleGameId));
  };

  const getSelectedGame = (oracleGameId) => {
    return selectedGames.find((item) => String(item.gameId) === String(oracleGameId));
  };

  const selectedCountThisPage = useMemo(() => {
    return paginatedGames.reduce((total, game) => {
      return isGameSelected(game._id) ? total + 1 : total;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedGames, selectedGames]);

  const allSelectedThisPage =
    paginatedGames.length > 0 && selectedCountThisPage === paginatedGames.length;

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const oracleImage = (game) => {
    return game?.image || "";
  };

  const handleSelectGame = async (game) => {
    if (!selectedCategoryId) return toast.error("Please select category");
    if (!selectedProviderDbId) return toast.error("Please select provider");

    const alreadySelected = isGameSelected(game._id);

    try {
      if (alreadySelected) {
        const selectedDoc = getSelectedGame(game._id);

        if (!selectedDoc?._id) {
          return toast.error("Selected game data not found");
        }

        await api.delete(`/api/master/rb-games/${selectedDoc._id}`);

        setSelectedGames((prev) =>
          prev.filter((item) => item._id !== selectedDoc._id)
        );

        toast.success("Game removed");
        return;
      }

      const fd = new FormData();

      fd.append("categoryId", selectedCategoryId);
      fd.append("providerDbId", selectedProviderDbId);
      fd.append("gameId", game._id);
      fd.append("isHot", String(Boolean(form.isHot)));
      fd.append("isNew", String(Boolean(form.isNew)));
      fd.append("isJackpot", String(Boolean(form.isJackpot)));
      fd.append("status", form.status || "active");

      // Oracle image URL save hobe na.
      // Shudhu custom upload korle image save hobe.
      if (form.image instanceof File) {
        fd.append("image", form.image);
      }

      const res = await api.post("/api/master/rb-games", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSelectedGames((prev) => [res.data?.data, ...prev]);
      toast.success("Game added");
      resetAddForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed");
    }
  };

  const handleSelectAllThisPage = async () => {
    if (bulkLoading) return;
    if (!paginatedGames.length) return;

    if (!selectedCategoryId) return toast.error("Please select category");
    if (!selectedProviderDbId) return toast.error("Please select provider");

    try {
      setBulkLoading(true);

      let added = 0;
      let skipped = 0;
      let failed = 0;

      for (const game of paginatedGames) {
        if (isGameSelected(game._id)) {
          skipped++;
          continue;
        }

        const fd = new FormData();

        fd.append("categoryId", selectedCategoryId);
        fd.append("providerDbId", selectedProviderDbId);
        fd.append("gameId", game._id);
        fd.append("isHot", String(Boolean(form.isHot)));
        fd.append("isNew", String(Boolean(form.isNew)));
        fd.append("isJackpot", String(Boolean(form.isJackpot)));
        fd.append("status", form.status || "active");

        // Bulk action custom image use korbe na.
        // Oracle image DB te save hobe na.

        try {
          const res = await api.post("/api/master/rb-games", fd, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          setSelectedGames((prev) => [res.data?.data, ...prev]);
          added++;
        } catch {
          failed++;
        }
      }

      if (added) toast.success(`Selected ${added} games`);
      if (skipped) toast.info(`Skipped ${skipped} already selected`);
      if (failed) toast.error(`Failed ${failed} games`);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRemoveAllThisPage = async () => {
    if (bulkLoading) return;
    if (!paginatedGames.length) return;

    try {
      setBulkLoading(true);

      let removed = 0;
      let skipped = 0;
      let failed = 0;

      for (const game of paginatedGames) {
        const selectedDoc = getSelectedGame(game._id);

        if (!selectedDoc?._id) {
          skipped++;
          continue;
        }

        try {
          await api.delete(`/api/master/rb-games/${selectedDoc._id}`);

          setSelectedGames((prev) =>
            prev.filter((item) => item._id !== selectedDoc._id)
          );

          removed++;
        } catch {
          failed++;
        }
      }

      if (removed) toast.success(`Removed ${removed} games`);
      if (skipped) toast.info(`Skipped ${skipped} not selected`);
      if (failed) toast.error(`Failed ${failed} removes`);
    } finally {
      setBulkLoading(false);
    }
  };

  const openEditModal = (selectedDoc, oracleGame = null) => {
    setEditingGame({
      ...selectedDoc,
      oracleGame,
    });

    setEditForm({
      image: null,
      isHot: Boolean(selectedDoc.isHot),
      isNew: Boolean(selectedDoc.isNew),
      isJackpot: Boolean(selectedDoc.isJackpot),
      status: selectedDoc.status || "active",
    });

    if (selectedDoc.image) {
      setEditPreview(fileUrl(selectedDoc.image));
    } else if (oracleGame?.image) {
      setEditPreview(oracleGame.image);
    } else {
      setEditPreview("");
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGame(null);
    setEditForm(initialEditFlags);
    setEditPreview("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editingGame?._id) return;

    try {
      const fd = new FormData();

      fd.append("isHot", String(Boolean(editForm.isHot)));
      fd.append("isNew", String(Boolean(editForm.isNew)));
      fd.append("isJackpot", String(Boolean(editForm.isJackpot)));
      fd.append("status", editForm.status || "active");

      if (editForm.image instanceof File) {
        fd.append("image", editForm.image);
      }

      const res = await api.put(`/api/master/rb-games/${editingGame._id}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSelectedGames((prev) =>
        prev.map((item) => (item._id === editingGame._id ? res.data?.data : item))
      );

      toast.success("Game updated");
      closeModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Update failed");
    }
  };

  const handleRemoveCustomImage = async () => {
    if (!editingGame?._id) return;

    try {
      const res = await api.patch(
        `/api/master/rb-games/${editingGame._id}/remove-image`
      );

      setSelectedGames((prev) =>
        prev.map((item) => (item._id === editingGame._id ? res.data?.data : item))
      );

      setEditPreview(editingGame?.oracleGame?.image || "");
      toast.success("Custom image removed");
      closeModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove image");
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedProviderDbId("");
    setProviderGames([]);
    setSelectedGames([]);
    setCurrentPage(1);
    setSearchGame("");
    resetAddForm();
  };

  const handleProviderChange = (providerDbId) => {
    setSelectedProviderDbId(providerDbId);
    setProviderGames([]);
    setSelectedGames([]);
    setCurrentPage(1);
    setSearchGame("");
    resetAddForm();
  };

  return (
    <div className="space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
              <Gamepad2 className="h-9 w-9" />
            </div>

            <h1 className="text-3xl font-black md:text-4xl">
              RB Game{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                Management
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Select RB category and provider, then add Oracle games to your
              master panel. Oracle image is not saved; custom uploaded image is
              saved only when you upload it.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="text-sm font-black text-emerald-100">
                  50 Games Per Page
                </p>
                <p className="text-xs text-emerald-200/80">
                  Bulk select and remove ready
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black">Select Category & Provider</h2>
          <p className="text-sm text-slate-400">
            Provider games will load from Oracle API by provider code.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>Select RB Category</label>

            <select
              value={selectedCategoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={inputClass}
            >
              <option className="bg-[#030712]" value="">
                {loadingCategories ? "Loading categories..." : "Choose category..."}
              </option>

              {categories.map((category) => (
                <option
                  className="bg-[#030712]"
                  key={category._id}
                  value={category._id}
                >
                  {category.categoryName?.en} • {category.categoryName?.bn}
                </option>
              ))}
            </select>

            {selectedCategoryId && (
              <p className="mt-2 text-xs text-cyan-300/80">
                Selected: <span className="font-black">{selectedCategoryName}</span>
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Select RB Provider</label>

            <select
              value={selectedProviderDbId}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={!selectedCategoryId || loadingProviders}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <option className="bg-[#030712]" value="">
                {!selectedCategoryId
                  ? "Select category first"
                  : loadingProviders
                    ? "Loading providers..."
                    : "Choose provider..."}
              </option>

              {providers.map((provider) => (
                <option
                  className="bg-[#030712]"
                  key={provider._id}
                  value={provider._id}
                >
                  {provider.providerName} ({provider.providerId})
                </option>
              ))}
            </select>

            {selectedProvider && (
              <p className="mt-2 text-xs text-cyan-300/80">
                Provider Code:{" "}
                <span className="font-mono font-black">
                  {selectedProvider.providerId}
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      {selectedProviderDbId && providerGames.length > 0 && !loadingGames && (
        <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-xl font-black">Bulk Actions</h2>
              <p className="text-sm text-slate-400">
                This page selected{" "}
                <span className="font-black text-cyan-300">
                  {selectedCountThisPage}/{paginatedGames.length}
                </span>{" "}
                games
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_160px_170px_170px]">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <Search className="h-5 w-5 text-cyan-300" />
                <input
                  value={searchGame}
                  onChange={(e) => {
                    setSearchGame(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search game name, ID, code..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>

              <button
                onClick={loadOracleGames}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
              >
                <RefreshCw className="h-4 w-4" />
                Reload
              </button>

              <button
                onClick={handleSelectAllThisPage}
                disabled={bulkLoading || allSelectedThisPage}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Select All Page
              </button>

              <button
                onClick={handleRemoveAllThisPage}
                disabled={bulkLoading || selectedCountThisPage === 0}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove All Page
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <ToggleCard
              title="Bulk HOT"
              subtitle="Apply when adding games"
              checked={form.isHot}
              icon={Flame}
              onChange={(value) => setForm((prev) => ({ ...prev, isHot: value }))}
            />

            <ToggleCard
              title="Bulk NEW"
              subtitle="Apply when adding games"
              checked={form.isNew}
              icon={Star}
              onChange={(value) => setForm((prev) => ({ ...prev, isNew: value }))}
            />

            <ToggleCard
              title="Bulk Jackpot"
              subtitle="Apply when adding games"
              checked={form.isJackpot}
              icon={Trophy}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, isJackpot: value }))
              }
            />

            <div>
              <label className={labelClass}>Bulk Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className={inputClass}
              >
                <option className="bg-[#030712]" value="active">
                  Active
                </option>
                <option className="bg-[#030712]" value="inactive">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
            <span>
              Page {currentPage} of {totalPages} • Showing{" "}
              {paginatedGames.length} of {filteredOracleGames.length} games
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {!selectedProviderDbId ? (
        <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-10 text-center shadow-2xl">
          <Gamepad2 className="mx-auto mb-4 h-14 w-14 text-slate-500" />
          <h3 className="text-xl font-black">Select category and provider</h3>
          <p className="mt-2 text-sm text-slate-400">
            After selecting provider, Oracle games will load here.
          </p>
        </section>
      ) : loadingGames || loadingSelectedGames ? (
        <section className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.06] p-10 shadow-2xl">
          <Loader2 className="h-9 w-9 animate-spin text-cyan-300" />
        </section>
      ) : providerGames.length === 0 ? (
        <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-10 text-center shadow-2xl">
          <Gamepad2 className="mx-auto mb-4 h-14 w-14 text-slate-500" />
          <h3 className="text-xl font-black">No games available</h3>
          <p className="mt-2 text-sm text-slate-400">
            This provider currently has no Oracle games.
          </p>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {paginatedGames.map((game) => {
            const selected = isGameSelected(game._id);
            const selectedDoc = getSelectedGame(game._id);

            const displayName = game.gameName || game.name || "Unnamed Game";

            const imageToShow = selectedDoc?.image
              ? fileUrl(selectedDoc.image)
              : oracleImage(game);

            return (
              <div
                key={game._id}
                className={`overflow-hidden rounded-[28px] border bg-black/25 shadow-xl transition hover:-translate-y-1 ${
                  selected
                    ? "border-emerald-300/50 shadow-emerald-950/30"
                    : "border-white/10 hover:border-cyan-300/30"
                }`}
              >
                <div className="relative h-48 bg-black/40">
                  {imageToShow ? (
                    <img
                      src={imageToShow}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600">
                      <ImagePlus className="h-10 w-10" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {selected && (
                    <div className="absolute right-3 top-3 rounded-xl bg-emerald-500 px-3 py-1 text-xs font-black text-white">
                      SELECTED
                    </div>
                  )}

                  <div className="absolute left-3 top-3 flex flex-col gap-2">
                    {(selected ? selectedDoc?.isHot : form.isHot) && (
                      <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-black">
                        HOT
                      </span>
                    )}

                    {(selected ? selectedDoc?.isNew : form.isNew) && (
                      <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-black">
                        NEW
                      </span>
                    )}

                    {(selected ? selectedDoc?.isJackpot : form.isJackpot) && (
                      <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white">
                        JACKPOT
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="line-clamp-2 text-lg font-black text-cyan-100">
                    {displayName}
                  </h3>

                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <p className="truncate">gameId: {game._id}</p>
                    <p className="truncate">game_code: {game.game_code || "—"}</p>
                  </div>

                  {!selected && (
                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-bold text-slate-200">
                        Custom Image Optional
                      </label>

                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/30 bg-black/30 px-4 py-3 text-sm font-black text-cyan-100 hover:border-cyan-300/60">
                        <UploadCloud className="h-5 w-5" />
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              image: e.target.files?.[0] || null,
                            }))
                          }
                          className="hidden"
                        />
                      </label>

                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Custom Preview"
                          className="mt-3 h-28 w-full rounded-2xl object-cover"
                        />
                      )}

                      <p className="mt-2 text-xs text-slate-500">
                        If no upload, Oracle image will display only from API,
                        not save in DB.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleSelectGame(game)}
                    className={`mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                      selected
                        ? "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                        : "bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 text-white"
                    }`}
                  >
                    {selected ? (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Add to Platform
                      </>
                    )}
                  </button>

                  {selected && (
                    <button
                      onClick={() => openEditModal(selectedDoc, game)}
                      className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Image / Flags
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {providerGames.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="cursor-pointer rounded-xl border border-white/10 bg-white/10 px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm font-bold text-slate-300">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="cursor-pointer rounded-xl border border-white/10 bg-white/10 px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {isModalOpen && editingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[800px] rounded-[32px] border border-white/10 bg-[#030712] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Edit RB Game</h2>
                <p className="text-sm text-slate-400">
                  Update custom image, flags and status
                </p>
              </div>

              <button
                onClick={closeModal}
                className="cursor-pointer rounded-xl bg-white/10 p-2 hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div>
                <label className={labelClass}>Game Preview</label>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                  {editPreview ? (
                    <img
                      src={editPreview}
                      alt="Preview"
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center text-slate-600">
                      <ImagePlus className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Upload Custom Image</label>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/30 bg-black/30 px-4 py-4 text-sm font-black text-cyan-100 hover:border-cyan-300/60">
                  <UploadCloud className="h-5 w-5" />
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        image: e.target.files?.[0] || null,
                      }))
                    }
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ToggleCard
                  title="HOT"
                  subtitle="Show hot badge"
                  checked={editForm.isHot}
                  icon={Flame}
                  onChange={(value) =>
                    setEditForm((prev) => ({ ...prev, isHot: value }))
                  }
                />

                <ToggleCard
                  title="NEW"
                  subtitle="Show new badge"
                  checked={editForm.isNew}
                  icon={Star}
                  onChange={(value) =>
                    setEditForm((prev) => ({ ...prev, isNew: value }))
                  }
                />

                <ToggleCard
                  title="Jackpot"
                  subtitle="Show jackpot"
                  checked={editForm.isJackpot}
                  icon={Trophy}
                  onChange={(value) =>
                    setEditForm((prev) => ({ ...prev, isJackpot: value }))
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Status</label>

                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option className="bg-[#030712]" value="active">
                    Active
                  </option>
                  <option className="bg-[#030712]" value="inactive">
                    Inactive
                  </option>
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <button
                  type="submit"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3 text-sm font-black text-white"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={handleRemoveCustomImage}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-500/10 px-5 py-3 text-sm font-black text-yellow-100 hover:bg-yellow-500/20"
                >
                  Remove Custom Image
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-200 hover:bg-red-500/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ToggleCard = ({ title, subtitle, checked, onChange, icon: Icon }) => {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-black text-white">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-16 cursor-pointer rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
            checked ? "left-9" : "left-1"
          }`}
        />
      </button>
    </div>
  );
};

export default RBAddGame;