import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Edit,
  Flame,
  Globe2,
  ImagePlus,
  Loader2,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL;
const ORACLE_PROVIDER_API = "https://api.oraclegames.live/api/providers";
const ORACLE_PROVIDER_KEY = import.meta.env.VITE_ORACLE_TOKEN;

const emptyForm = {
  categoryId: "",
  providerId: "",
  providerName: "",
  providerImage: null,
  providerIcon: null,
  status: "active",
  isHot: false,
  isNew: false,
};

const fileUrl = (path = "") => {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? path : `/${path}`}`;
};

const RBAddProvider = () => {
  const [categories, setCategories] = useState([]);
  const [oracleProviders, setOracleProviders] = useState([]);
  const [savedProviders, setSavedProviders] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [oracleLoading, setOracleLoading] = useState(false);

  const [imgPreview, setImgPreview] = useState("");
  const [iconPreview, setIconPreview] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hotFilter, setHotFilter] = useState("");
  const [newFilter, setNewFilter] = useState("");

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-cyan-300/60";
  const labelClass = "mb-2 block text-sm font-bold text-slate-200";

  const selectedCategoryName = useMemo(() => {
    const cat = categories.find((c) => c._id === form.categoryId);
    return cat?.categoryName?.en || "";
  }, [categories, form.categoryId]);

  const loadCategories = async () => {
    try {
      const res = await api.get("/api/master/rb-game-categories", {
        params: { limit: 200, status: "active" },
      });

      setCategories(res.data?.data?.categories || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load categories",
      );
    }
  };

  const loadOracleProviders = async () => {
    try {
      setOracleLoading(true);

      const res = await axios.get(ORACLE_PROVIDER_API, {
        headers: {
          "x-api-key": ORACLE_PROVIDER_KEY,
        },
      });

      setOracleProviders(res.data?.data || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to load providers from Oracle API",
      );
    } finally {
      setOracleLoading(false);
    }
  };

  const loadSavedProviders = async () => {
    try {
      setListLoading(true);

      const res = await api.get("/api/master/rb-game-providers", {
        params: {
          categoryId: form.categoryId || "",
          search,
          status: statusFilter,
          isHot: hotFilter,
          isNew: newFilter,
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
  }, [form.categoryId, search, statusFilter, hotFilter, newFilter]);

  useEffect(() => {
    if (form.providerImage instanceof File) {
      const url = URL.createObjectURL(form.providerImage);
      setImgPreview(url);
      return () => URL.revokeObjectURL(url);
    }

    if (editing?.providerImage) {
      setImgPreview(fileUrl(editing.providerImage));
      return;
    }

    setImgPreview("");
  }, [form.providerImage, editing]);

  useEffect(() => {
    if (form.providerIcon instanceof File) {
      const url = URL.createObjectURL(form.providerIcon);
      setIconPreview(url);
      return () => URL.revokeObjectURL(url);
    }

    if (editing?.providerIcon) {
      setIconPreview(fileUrl(editing.providerIcon));
      return;
    }

    setIconPreview("");
  }, [form.providerIcon, editing]);

  const handleProviderSelect = (providerCode) => {
    const selected = oracleProviders.find(
      (p) => String(p.providerCode) === String(providerCode),
    );

    setForm((prev) => ({
      ...prev,
      providerId: selected?.providerCode || "",
      providerName: selected?.providerName || "",
    }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setImgPreview("");
    setIconPreview("");
  };

  const startEdit = (provider) => {
    setEditing(provider);

    const categoryId =
      typeof provider.categoryId === "object"
        ? provider.categoryId?._id
        : provider.categoryId;

    setForm({
      categoryId: categoryId || "",
      providerId: provider.providerId || "",
      providerName: provider.providerName || "",
      providerImage: null,
      providerIcon: null,
      status: provider.status || "active",
      isHot: Boolean(provider.isHot),
      isNew: Boolean(provider.isNew),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.categoryId) return toast.error("Please select a category");
    if (!form.providerId || !form.providerName) {
      return toast.error("Please select a provider");
    }

    if (!editing && !(form.providerImage instanceof File)) {
      return toast.error("Provider image is required");
    }

    if (!editing && !(form.providerIcon instanceof File)) {
      return toast.error("Provider icon is required");
    }

    try {
      setLoading(true);

      const fd = new FormData();

      fd.append("categoryId", form.categoryId);
      fd.append("providerId", form.providerId);
      fd.append("providerName", form.providerName);
      fd.append("status", form.status);
      fd.append("isHot", String(Boolean(form.isHot)));
      fd.append("isNew", String(Boolean(form.isNew)));

      if (form.providerImage instanceof File) {
        fd.append("providerImage", form.providerImage);
      }

      if (form.providerIcon instanceof File) {
        fd.append("providerIcon", form.providerIcon);
      }

      if (editing?._id) {
        await api.put(`/api/master/rb-game-providers/${editing._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Provider updated successfully");
      } else {
        await api.post("/api/master/rb-game-providers", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Provider added successfully");
      }

      await loadSavedProviders();
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this provider?");
    if (!ok) return;

    try {
      await api.delete(`/api/master/rb-game-providers/${id}`);

      toast.success("Provider deleted");
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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
              <Globe2 className="h-9 w-9" />
            </div>

            <h1 className="text-3xl font-black md:text-4xl">
              RB Game{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                Provider
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Add Oracle providers under RB categories from the master panel.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="text-sm font-black text-emerald-100">
                  Oracle Provider API
                </p>
                <p className="text-xs text-emerald-200/80">
                  {oracleLoading
                    ? "Loading providers..."
                    : `${oracleProviders.length} providers loaded`}
                </p>
              </div>
            </div>
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
                {editing ? "Update Provider" : "Add Provider"}
              </h2>
              <p className="text-sm text-slate-400">
                Select category and Oracle provider
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
            <div className="md:col-span-2">
              <label className={labelClass}>Select RB Game Category *</label>

              <select
                className={inputClass}
                value={form.categoryId}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }));
                  setEditing(null);
                }}
              >
                <option className="bg-[#030712]" value="">
                  Choose category...
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

              {form.categoryId && (
                <p className="mt-2 text-xs text-cyan-300/80">
                  Selected:{" "}
                  <span className="font-black">{selectedCategoryName}</span>
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Select Oracle Provider *</label>

              <select
                className={inputClass}
                value={form.providerId}
                onChange={(e) => handleProviderSelect(e.target.value)}
              >
                <option className="bg-[#030712]" value="">
                  {oracleLoading
                    ? "Loading providers..."
                    : "Choose provider..."}
                </option>

                {oracleProviders.map((provider) => (
                  <option
                    className="bg-[#030712]"
                    key={provider._id || provider.providerCode}
                    value={provider.providerCode}
                  >
                    {provider.providerName} ({provider.providerCode})
                  </option>
                ))}
              </select>

              {form.providerId && (
                <p className="mt-2 text-xs text-cyan-300/80">
                  Code: <span className="font-mono">{form.providerId}</span> •
                  Name: <span className="font-black">{form.providerName}</span>
                </p>
              )}
            </div>

            <ToggleCard
              title="Mark as HOT"
              subtitle="Show HOT badge on provider"
              checked={form.isHot}
              icon={Flame}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, isHot: value }))
              }
            />

            <ToggleCard
              title="Mark as NEW"
              subtitle="Show NEW badge on provider"
              checked={form.isNew}
              icon={Star}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, isNew: value }))
              }
            />

            <FileInput
              label={`Provider Image ${editing ? "" : "*"}`}
              preview={imgPreview}
              onChange={(file) => setForm({ ...form, providerImage: file })}
              large
            />

            <FileInput
              label={`Provider Icon ${editing ? "" : "*"}`}
              preview={iconPreview}
              onChange={(file) => setForm({ ...form, providerIcon: file })}
            />

            <div className="md:col-span-2">
              <label className={labelClass}>Status</label>

              <select
                className={inputClass}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_50px_rgba(34,211,238,0.20)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
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
                : "Add Provider"}
          </button>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
          <h2 className="text-xl font-black">Live Preview</h2>
          <p className="mt-1 text-sm text-slate-400">
            Provider card preview before save
          </p>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
            <div className="relative h-48 bg-black/40">
              {imgPreview ? (
                <img
                  src={imgPreview}
                  alt="Provider"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  <ImagePlus className="h-12 w-12" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute left-3 top-3 flex flex-col gap-2">
                {form.isHot && (
                  <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-black">
                    HOT
                  </span>
                )}

                {form.isNew && (
                  <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-black">
                    NEW
                  </span>
                )}
              </div>

              <div className="absolute right-3 top-3">
                <span
                  className={`rounded-xl px-3 py-1 text-xs font-black ${
                    form.status === "active"
                      ? "bg-emerald-500/90 text-white"
                      : "bg-red-500/90 text-white"
                  }`}
                >
                  {form.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/30 bg-black/50">
                {iconPreview ? (
                  <img
                    src={iconPreview}
                    alt="Icon"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <Globe2 className="h-8 w-8 text-cyan-300" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-cyan-100">
                  {form.providerName || "Provider Name"}
                </h3>
                <p className="truncate text-xs font-mono text-slate-400">
                  {form.providerId || "provider_code"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-xl font-black">RB Providers</h2>
            <p className="text-sm text-slate-400">
              Total {savedProviders.length} providers found
              {form.categoryId && selectedCategoryName ? (
                <span className="ml-1 text-cyan-300">
                  under {selectedCategoryName}
                </span>
              ) : null}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px_140px_120px_120px_120px]">
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
              value={form.categoryId}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  categoryId: e.target.value,
                }));
                setEditing(null);
              }}
              className={inputClass}
            >
              <option className="bg-[#030712]" value="">
                All Categories
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
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
              value={hotFilter}
              onChange={(e) => setHotFilter(e.target.value)}
              className={inputClass}
            >
              <option className="bg-[#030712]" value="">
                Hot All
              </option>
              <option className="bg-[#030712]" value="true">
                Hot
              </option>
              <option className="bg-[#030712]" value="false">
                Not Hot
              </option>
            </select>

            <select
              value={newFilter}
              onChange={(e) => setNewFilter(e.target.value)}
              className={inputClass}
            >
              <option className="bg-[#030712]" value="">
                New All
              </option>
              <option className="bg-[#030712]" value="true">
                New
              </option>
              <option className="bg-[#030712]" value="false">
                Not New
              </option>
            </select>

            <button
              onClick={loadSavedProviders}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {form.categoryId && (
          <div className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
            Selected Category:{" "}
            <span className="font-black">
              {selectedCategoryName || "Unknown"}
            </span>{" "}
            — Providers:{" "}
            <span className="font-black">{savedProviders.length}</span>
          </div>
        )}

        {listLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          </div>
        ) : savedProviders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-slate-400">
            No providers found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {savedProviders.map((provider) => (
              <div
                key={provider._id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-black/25 shadow-xl transition hover:-translate-y-1 hover:border-cyan-300/30"
              >
                <div className="relative h-44 bg-black/40">
                  {provider.providerImage ? (
                    <img
                      src={fileUrl(provider.providerImage)}
                      alt={provider.providerName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600">
                      <ImagePlus className="h-10 w-10" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute left-3 top-3 flex flex-col gap-2">
                    {provider.isHot && (
                      <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-black">
                        HOT
                      </span>
                    )}

                    {provider.isNew && (
                      <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-black">
                        NEW
                      </span>
                    )}
                  </div>

                  <div className="absolute right-3 top-3">
                    <span
                      className={`rounded-xl px-3 py-1 text-xs font-black ${
                        provider.status === "active"
                          ? "bg-emerald-500/90 text-white"
                          : "bg-red-500/90 text-white"
                      }`}
                    >
                      {provider.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/30 bg-black/50">
                      {provider.providerIcon ? (
                        <img
                          src={fileUrl(provider.providerIcon)}
                          alt="Icon"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Globe2 className="h-7 w-7 text-cyan-300" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-cyan-100">
                        {provider.providerName}
                      </h3>
                      <p className="truncate text-xs font-mono text-slate-400">
                        {provider.providerId}
                      </p>
                    </div>
                  </div>

                  <p className="mb-4 truncate text-xs text-slate-500">
                    Category:{" "}
                    {provider.categoryId?.categoryName?.en ||
                      selectedCategoryName ||
                      "—"}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => startEdit(provider)}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>

                    <button
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

const FileInput = ({ label, preview, onChange, large = false }) => {
  return (
    <div className={large ? "md:col-span-2" : ""}>
      <label className="mb-2 block text-sm font-bold text-slate-200">
        {label}
      </label>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/30 bg-black/30 p-5 text-center transition hover:border-cyan-300/60 hover:bg-cyan-300/5">
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className={`rounded-2xl object-contain ${
              large ? "h-52 w-full" : "h-24 w-24"
            }`}
          />
        ) : (
          <>
            <ImagePlus className="mb-3 h-9 w-9 text-cyan-300" />
            <p className="text-sm font-black text-slate-100">Click to upload</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP, SVG</p>
          </>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>
    </div>
  );
};

export default RBAddProvider;
