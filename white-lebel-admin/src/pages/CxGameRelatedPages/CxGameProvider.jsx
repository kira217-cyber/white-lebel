import React, { useEffect, useMemo, useState } from "react";
import {
  Edit,
  Globe2,
  Home,
  ImagePlus,
  Loader2,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Server,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL;

const emptyForm = {
  categoryId: "",
  providerCode: "",
  providerName: "",
  providerIcon: null,
  status: "active",
  isHome: false,
};

const fileUrl = (path = "") => {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? path : `/${path}`}`;
};

const cleanText = (value = "") => String(value || "").trim();
const cleanProviderCode = (value = "") => cleanText(value).toUpperCase();

const CxGameProvider = () => {
  const [categories, setCategories] = useState([]);
  const [oracleProviders, setOracleProviders] = useState([]);
  const [savedProviders, setSavedProviders] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [oracleLoading, setOracleLoading] = useState(false);

  const [iconPreview, setIconPreview] = useState("");
  const [oracleSearch, setOracleSearch] = useState("");
  const [showSearchList, setShowSearchList] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [homeFilter, setHomeFilter] = useState("");
  const [syncFilter, setSyncFilter] = useState("");

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-cyan-300/60";

  const labelClass = "mb-2 block text-sm font-bold text-slate-200";

  const selectedCategoryName = useMemo(() => {
    const cat = categories.find((c) => c._id === form.categoryId);
    return cat?.categoryName?.en || "";
  }, [categories, form.categoryId]);

  const selectedOracleProvider = useMemo(() => {
    return oracleProviders.find(
      (p) => String(p.providerCode) === String(form.providerCode),
    );
  }, [oracleProviders, form.providerCode]);

  const filteredOracleProviders = useMemo(() => {
    const keyword = oracleSearch.trim().toLowerCase();

    if (!keyword) return oracleProviders.slice(0, 30);

    return oracleProviders
      .filter((item) => {
        return (
          item.providerName?.toLowerCase().includes(keyword) ||
          item.providerCode?.toLowerCase().includes(keyword)
        );
      })
      .slice(0, 50);
  }, [oracleProviders, oracleSearch]);

  const loadCategories = async () => {
    try {
      const res = await api.get("/api/master/cx-game-categories/admin/all");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setCategories(list.filter((item) => item.status === "active"));
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load categories",
      );
    }
  };

  const loadOracleProviders = async () => {
    try {
      setOracleLoading(true);

      const res = await api.get("/api/master/cx-game-providers/oracle/list");
      setOracleProviders(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load Oracle providers",
      );
    } finally {
      setOracleLoading(false);
    }
  };

  const loadSavedProviders = async () => {
    try {
      setListLoading(true);

      const res = await api.get("/api/master/cx-game-providers", {
        params: {
          categoryId: form.categoryId || "",
          search,
          status: statusFilter,
          isHome: homeFilter,
          syncStatus: syncFilter,
          limit: 100,
        },
      });

      setSavedProviders(res.data?.data?.providers || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load providers");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadOracleProviders();
  }, []);

  useEffect(() => {
    loadSavedProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId, search, statusFilter, homeFilter, syncFilter]);

  useEffect(() => {
    if (form.providerIcon instanceof File) {
      const url = URL.createObjectURL(form.providerIcon);
      setIconPreview(url);
      return () => URL.revokeObjectURL(url);
    }

    if (editing?.providerIconUrl) {
      setIconPreview(editing.providerIconUrl);
      return;
    }

    if (editing?.providerIcon) {
      setIconPreview(fileUrl(editing.providerIcon));
      return;
    }

    if (selectedOracleProvider?.image && !editing) {
      setIconPreview(selectedOracleProvider.image);
      return;
    }

    setIconPreview("");
  }, [form.providerIcon, editing, selectedOracleProvider]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setIconPreview("");
    setOracleSearch("");
    setShowSearchList(false);
  };

  const applyOracleProvider = (provider) => {
    setForm((prev) => ({
      ...prev,
      providerCode: provider.providerCode,
      providerName: provider.providerName,
    }));

    setOracleSearch(`${provider.providerCode} - ${provider.providerName}`);
    setShowSearchList(false);
  };

  const startEdit = (provider) => {
    setEditing(provider);

    setForm({
      categoryId: provider?.categoryId?._id || provider?.categoryId || "",
      providerCode: provider?.providerCode || "",
      providerName: provider?.providerName || "",
      providerIcon: null,
      status: provider?.status || "active",
      isHome: !!provider?.isHome,
    });

    setOracleSearch("");
    setShowSearchList(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.categoryId) return toast.error("Category is required");

    if (!form.providerCode.trim() || !form.providerName.trim()) {
      return toast.error("Provider code and name are required");
    }

    try {
      setLoading(true);

      const fd = new FormData();

      fd.append("categoryId", form.categoryId);
      fd.append("providerCode", cleanProviderCode(form.providerCode));
      fd.append("providerName", form.providerName.trim());
      fd.append("status", form.status);
      fd.append("isHome", String(form.isHome));

      if (form.providerIcon instanceof File) {
        fd.append("providerIcon", form.providerIcon);
      }

      if (editing?._id) {
        await api.put(`/api/master/cx-game-providers/${editing._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Provider updated successfully");
      } else {
        await api.post("/api/master/cx-game-providers", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Provider created successfully");
      }

      await loadSavedProviders();
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSelectedOracle = async () => {
    if (!form.categoryId) return toast.error("Please select category first");

    if (!form.providerCode || !form.providerName) {
      return toast.error("Please select Oracle provider first");
    }

    try {
      setLoading(true);

      await api.post("/api/master/cx-game-providers/oracle/sync", {
        categoryId: form.categoryId,
        providers: [
          {
            providerCode: form.providerCode,
            providerName: form.providerName,
            image: selectedOracleProvider?.image || "",
          },
        ],
      });

      toast.success("Provider synced successfully");
      await loadSavedProviders();
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Sync failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm(
      "Are you sure? This provider related all games will also be deleted.",
    );

    if (!ok) return;

    try {
      const res = await api.delete(`/api/master/cx-game-providers/${id}`);

      toast.success(
        `Provider deleted. Deleted games: ${res.data?.data?.deletedGames || 0}`,
      );

      setSavedProviders((prev) => prev.filter((item) => item._id !== id));
      if (editing?._id === id) resetForm();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to delete provider",
      );
    }
  };

  return (
    <div className="space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
              <Server className="h-9 w-9" />
            </div>

            <h1 className="text-3xl font-black md:text-4xl">
              CX Game{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                Provider
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Add, sync and manage CX providers from master admin panel.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="text-sm font-black text-emerald-100">
              Total Providers
            </p>
            <p className="mt-1 text-3xl font-black text-emerald-200">
              {savedProviders.length}
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"
      >
        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">
                {editing ? "Update Provider" : "Create Provider"}
              </h2>
              <p className="text-sm text-slate-400">
                Select category, Oracle provider and provider icon.
              </p>
            </div>

            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/20"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className={labelClass}>Category *</label>
              <select
                className={`${inputClass} cursor-pointer`}
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
              >
                <option className="bg-[#030712]" value="">
                  Select Category
                </option>

                {categories.map((cat) => (
                  <option
                    className="bg-[#030712]"
                    key={cat._id}
                    value={cat._id}
                  >
                    {cat.categoryName?.en || "Unnamed Category"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>All Oracle Provider List</label>
              <select
                className={`${inputClass} cursor-pointer`}
                value={form.providerCode}
                onChange={(e) => {
                  const provider = oracleProviders.find(
                    (item) => item.providerCode === e.target.value,
                  );

                  if (provider) {
                    applyOracleProvider(provider);
                  } else {
                    setForm({
                      ...form,
                      providerCode: "",
                      providerName: "",
                    });
                    setOracleSearch("");
                  }
                }}
              >
                <option className="bg-[#030712]" value="">
                  Select Provider From Full List
                </option>

                {oracleProviders.map((provider) => (
                  <option
                    className="bg-[#030712]"
                    key={provider.providerCode}
                    value={provider.providerCode}
                  >
                    {provider.providerCode} - {provider.providerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative md:col-span-2">
              <label className={labelClass}>Search Oracle Provider</label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <Search className="h-5 w-5 text-cyan-300" />

                <input
                  value={oracleSearch}
                  onFocus={() => setShowSearchList(true)}
                  onChange={(e) => {
                    setOracleSearch(e.target.value);
                    setShowSearchList(true);
                  }}
                  placeholder="Type provider name/code and select..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              {showSearchList && (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#030712] p-2 shadow-2xl">
                  {filteredOracleProviders.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-slate-400">
                      No provider found.
                    </div>
                  ) : (
                    filteredOracleProviders.map((provider) => (
                      <button
                        key={provider.providerCode}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyOracleProvider(provider)}
                        className="mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-cyan-300/10"
                      >
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/20 bg-black/40">
                          {provider.image ? (
                            <img
                              src={provider.image}
                              alt={provider.providerName}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <Server className="h-5 w-5 text-cyan-300" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-cyan-100">
                            {provider.providerName}
                          </p>
                          <p className="text-xs font-bold text-cyan-300">
                            {provider.providerCode}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Provider Code *</label>
              <input
                className={inputClass}
                value={form.providerCode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    providerCode: cleanProviderCode(e.target.value),
                  })
                }
                placeholder="e.g. PG"
              />
            </div>

            <div>
              <label className={labelClass}>Provider Name *</label>
              <input
                className={inputClass}
                value={form.providerName}
                onChange={(e) =>
                  setForm({ ...form, providerName: e.target.value })
                }
                placeholder="e.g. PG Soft"
              />
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                className={`${inputClass} cursor-pointer`}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option className="bg-[#030712]" value="active">
                  Active
                </option>
                <option className="bg-[#030712]" value="inactive">
                  Inactive
                </option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Home Provider</label>

              <button
                type="button"
                onClick={() => setForm({ ...form, isHome: !form.isHome })}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                  form.isHome
                    ? "border-cyan-300/50 bg-cyan-300/20 text-white"
                    : "border-white/10 bg-black/30 text-slate-300 hover:bg-cyan-300/10"
                }`}
              >
                <Home className="h-5 w-5" />
                {form.isHome ? "Show In Home" : "Not Home"}
              </button>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Provider Icon</label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/30 bg-black/25 p-5 text-center transition hover:border-cyan-300/60 hover:bg-cyan-300/5">
                {iconPreview ? (
                  <img
                    src={iconPreview}
                    alt="Provider Preview"
                    className="h-28 w-28 rounded-2xl object-contain"
                  />
                ) : (
                  <>
                    <ImagePlus className="mb-3 h-10 w-10 text-cyan-300" />
                    <p className="text-sm font-black text-slate-100">
                      Click to upload icon
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      PNG, JPG, WEBP, SVG
                    </p>
                  </>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      providerIcon: e.target.files?.[0] || null,
                    })
                  }
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_50px_rgba(34,211,238,0.20)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : editing ? (
                <Save className="h-5 w-5" />
              ) : (
                <PlusCircle className="h-5 w-5" />
              )}

              {loading
                ? "Saving..."
                : editing
                  ? "Update Provider"
                  : "Create Provider"}
            </button>

            <button
              type="button"
              onClick={handleSyncSelectedOracle}
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3.5 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Globe2 className="h-5 w-5" />
              Sync Selected Oracle
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
          <h2 className="text-xl font-black">Live Preview</h2>
          <p className="mt-1 text-sm text-slate-400">Preview before saving.</p>

          <div className="mt-5 overflow-hidden rounded-3xl border border-cyan-300/20 bg-black/35 p-6 text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/30 bg-cyan-300/10">
              {iconPreview ? (
                <img
                  src={iconPreview}
                  alt="Provider Icon"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <ImagePlus className="h-12 w-12 text-slate-500" />
              )}
            </div>

            <h3 className="mt-5 text-lg font-black text-cyan-100">
              {form.providerName || "Provider Name"}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              {form.providerCode || "PROVIDER_CODE"}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Category: {selectedCategoryName || "Not Selected"}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span
                className={`rounded-xl px-3 py-1 text-xs font-black ${
                  form.status === "active"
                    ? "bg-emerald-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {form.status.toUpperCase()}
              </span>

              {form.isHome && (
                <span className="rounded-xl bg-cyan-500 px-3 py-1 text-xs font-black text-white">
                  HOME
                </span>
              )}
            </div>
          </div>
        </div>
      </form>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-xl font-black">CX Game Providers</h2>
            <p className="text-sm text-slate-400">
              Total {savedProviders.length} providers found
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_150px_120px]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <Search className="h-5 w-5 text-cyan-300" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search provider..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option className="bg-[#030712]" value="">
                All Status
              </option>
              <option className="bg-[#030712]" value="active">
                Active
              </option>
              <option className="bg-[#030712]" value="inactive">
                Inactive
              </option>
            </select>

            <select
              value={homeFilter}
              onChange={(e) => setHomeFilter(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option className="bg-[#030712]" value="">
                All Home
              </option>
              <option className="bg-[#030712]" value="true">
                Home
              </option>
              <option className="bg-[#030712]" value="false">
                Not Home
              </option>
            </select>

            <select
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option className="bg-[#030712]" value="">
                All Sync
              </option>
              <option className="bg-[#030712]" value="pending">
                Pending
              </option>
              <option className="bg-[#030712]" value="synced">
                Synced
              </option>
              <option className="bg-[#030712]" value="failed">
                Failed
              </option>
            </select>

            <button
              type="button"
              onClick={() => {
                loadSavedProviders();
                loadOracleProviders();
              }}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/20"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {oracleLoading && (
          <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100">
            Loading Oracle providers...
          </div>
        )}

        {listLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          </div>
        ) : savedProviders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-10 text-center text-slate-400">
            No providers found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {savedProviders.map((provider) => (
              <div
                key={provider._id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5 shadow-xl transition hover:-translate-y-1 hover:border-cyan-300/50"
              >
                <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                  {provider.providerIconUrl || provider.providerIcon ? (
                    <img
                      src={
                        provider.providerIconUrl ||
                        fileUrl(provider.providerIcon)
                      }
                      alt={provider.providerName}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <ImagePlus className="h-10 w-10 text-slate-600" />
                  )}
                </div>

                <div className="mt-5 text-center">
                  <h3 className="truncate text-lg font-black text-cyan-100">
                    {provider.providerName || "—"}
                  </h3>

                  <p className="mt-1 text-sm font-bold text-cyan-300">
                    {provider.providerCode || "—"}
                  </p>

                  <p className="mt-2 truncate text-xs text-slate-500">
                    Category:{" "}
                    {provider.categoryId?.categoryName?.en || "Unknown"}
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <span
                      className={`rounded-xl px-3 py-1 text-xs font-black ${
                        provider.status === "active"
                          ? "bg-emerald-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {provider.status?.toUpperCase()}
                    </span>

                    {provider.isHome && (
                      <span className="rounded-xl bg-cyan-500 px-3 py-1 text-xs font-black text-white">
                        HOME
                      </span>
                    )}

                    <span className="rounded-xl bg-black/50 px-3 py-1 text-xs font-black text-slate-300">
                      {provider.syncStatus || "pending"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(provider)}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-100 hover:bg-cyan-300/20"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(provider._id)}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-200 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>

                  <p className="mt-4 truncate text-[11px] text-slate-600">
                    ID: {provider._id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CxGameProvider;
