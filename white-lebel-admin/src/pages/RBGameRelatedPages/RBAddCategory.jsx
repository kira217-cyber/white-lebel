import React, { useEffect, useState } from "react";
import {
  Edit,
  ImagePlus,
  Loader2,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL;

const emptyForm = {
  categoryNameBn: "",
  categoryNameEn: "",
  categoryTitleBn: "",
  categoryTitleEn: "",
  bannerImage: null,
  iconImage: null,
  order: "",
  jackpot: false,
  status: "active",
};

const fileUrl = (path = "") => {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? path : `/${path}`}`;
};

const RBAddCategory = () => {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [jackpot, setJackpot] = useState("");

  const [bannerPreview, setBannerPreview] = useState("");
  const [iconPreview, setIconPreview] = useState("");

  const loadCategories = async () => {
    try {
      setListLoading(true);

      const res = await api.get("/api/master/rb-game-categories", {
        params: {
          search,
          status,
          jackpot,
          limit: 100,
        },
      });

      setCategories(res.data?.data?.categories || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load categories"
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, jackpot]);

  useEffect(() => {
    if (form.bannerImage instanceof File) {
      const url = URL.createObjectURL(form.bannerImage);
      setBannerPreview(url);
      return () => URL.revokeObjectURL(url);
    }

    if (editing?.bannerImage) {
      setBannerPreview(fileUrl(editing.bannerImage));
      return;
    }

    setBannerPreview("");
  }, [form.bannerImage, editing]);

  useEffect(() => {
    if (form.iconImage instanceof File) {
      const url = URL.createObjectURL(form.iconImage);
      setIconPreview(url);
      return () => URL.revokeObjectURL(url);
    }

    if (editing?.iconImage) {
      setIconPreview(fileUrl(editing.iconImage));
      return;
    }

    setIconPreview("");
  }, [form.iconImage, editing]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setBannerPreview("");
    setIconPreview("");
  };

  const startEdit = (category) => {
    setEditing(category);

    setForm({
      categoryNameBn: category?.categoryName?.bn || "",
      categoryNameEn: category?.categoryName?.en || "",
      categoryTitleBn: category?.categoryTitle?.bn || "",
      categoryTitleEn: category?.categoryTitle?.en || "",
      bannerImage: null,
      iconImage: null,
      order: category?.order ? String(category.order) : "",
      jackpot: Boolean(category?.jackpot),
      status: category?.status || "active",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.categoryNameBn || !form.categoryNameEn) {
      return toast.error("Category name BN and EN are required");
    }

    if (!form.categoryTitleBn || !form.categoryTitleEn) {
      return toast.error("Category title BN and EN are required");
    }

    if (!editing && !(form.bannerImage instanceof File)) {
      return toast.error("Banner image is required");
    }

    try {
      setLoading(true);

      const fd = new FormData();

      fd.append("categoryNameBn", form.categoryNameBn);
      fd.append("categoryNameEn", form.categoryNameEn);
      fd.append("categoryTitleBn", form.categoryTitleBn);
      fd.append("categoryTitleEn", form.categoryTitleEn);
      fd.append("status", form.status);
      fd.append("jackpot", String(form.jackpot));

      if (String(form.order || "").trim()) {
        fd.append("order", String(form.order).trim());
      }

      if (form.bannerImage instanceof File) {
        fd.append("bannerImage", form.bannerImage);
      }

      if (form.iconImage instanceof File) {
        fd.append("iconImage", form.iconImage);
      }

      if (editing?._id) {
        await api.put(`/api/master/rb-game-categories/${editing._id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Category updated successfully");
      } else {
        await api.post("/api/master/rb-game-categories", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Category created successfully");
      }

      await loadCategories();
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this category?");
    if (!ok) return;

    try {
      await api.delete(`/api/master/rb-game-categories/${id}`);

      toast.success("Category deleted successfully");
      setCategories((prev) => prev.filter((item) => item._id !== id));

      if (editing?._id === id) resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete category");
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-cyan-300/60";
  const labelClass = "mb-2 block text-sm font-bold text-slate-200";

  return (
    <div className="space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
              <Trophy className="h-9 w-9" />
            </div>

            <h1 className="text-3xl font-black md:text-4xl">
              RB Game{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                Category
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Create and manage RB script game categories from your master admin
              panel.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="text-sm font-black text-emerald-100">
                  Master Sync Ready
                </p>
                <p className="text-xs text-emerald-200/80">
                  Update once, sync later
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
                {editing ? "Update Category" : "Create Category"}
              </h2>
              <p className="text-sm text-slate-400">
                BN/EN content with banner and icon
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
              <label className={labelClass}>Category Name BN *</label>
              <input
                className={inputClass}
                value={form.categoryNameBn}
                onChange={(e) =>
                  setForm({ ...form, categoryNameBn: e.target.value })
                }
                placeholder="যেমন: স্লট গেম"
              />
            </div>

            <div>
              <label className={labelClass}>Category Name EN *</label>
              <input
                className={inputClass}
                value={form.categoryNameEn}
                onChange={(e) =>
                  setForm({ ...form, categoryNameEn: e.target.value })
                }
                placeholder="e.g. Slot Games"
              />
            </div>

            <div>
              <label className={labelClass}>Category Title BN *</label>
              <input
                className={inputClass}
                value={form.categoryTitleBn}
                onChange={(e) =>
                  setForm({ ...form, categoryTitleBn: e.target.value })
                }
                placeholder="যেমন: জনপ্রিয় স্লট গেমস"
              />
            </div>

            <div>
              <label className={labelClass}>Category Title EN *</label>
              <input
                className={inputClass}
                value={form.categoryTitleEn}
                onChange={(e) =>
                  setForm({ ...form, categoryTitleEn: e.target.value })
                }
                placeholder="e.g. Popular Slot Games"
              />
            </div>

            <div>
              <label className={labelClass}>Order</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
                placeholder="Leave empty for auto order"
              />
            </div>

            <div>
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

            <div className="md:col-span-2">
              <label className={labelClass}>Jackpot Category</label>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4">
                <div>
                  <p className="text-sm font-black text-white">
                    {form.jackpot ? "Jackpot Enabled" : "Jackpot Disabled"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Mark this category as jackpot category.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, jackpot: !prev.jackpot }))
                  }
                  className={`relative h-8 w-16 cursor-pointer rounded-full transition ${
                    form.jackpot ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                      form.jackpot ? "left-9" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <FileInput
              label={`Banner Image ${editing ? "" : "*"}`}
              preview={bannerPreview}
              onChange={(file) => setForm({ ...form, bannerImage: file })}
              large
            />

            <FileInput
              label="Icon Image"
              preview={iconPreview}
              onChange={(file) => setForm({ ...form, iconImage: file })}
            />
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
                ? "Update Category"
                : "Create Category"}
          </button>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
          <h2 className="text-xl font-black">Live Preview</h2>
          <p className="mt-1 text-sm text-slate-400">
            Category card preview before save
          </p>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
            <div className="relative h-48 bg-black/40">
              {bannerPreview ? (
                <img
                  src={bannerPreview}
                  alt="Banner"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  <ImagePlus className="h-12 w-12" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {iconPreview && (
                <div className="absolute left-4 top-4 h-14 w-14 overflow-hidden rounded-2xl border border-cyan-300/40 bg-black/60 p-1">
                  <img
                    src={iconPreview}
                    alt="Icon"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}

              <div className="absolute right-4 top-4 rounded-xl bg-cyan-300/90 px-3 py-1 text-xs font-black text-black">
                #{form.order || "AUTO"}
              </div>

              {form.jackpot && (
                <div className="absolute right-4 top-12 rounded-xl bg-emerald-500 px-3 py-1 text-xs font-black text-white">
                  ★ JACKPOT
                </div>
              )}

              <div className="absolute bottom-4 left-4">
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

            <div className="p-5">
              <h3 className="text-lg font-black text-cyan-100">
                {form.categoryNameEn || "Category Name"}
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                {form.categoryTitleEn || "Category title preview"}
              </p>
            </div>
          </div>
        </div>
      </form>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-black">RB Categories</h2>
            <p className="text-sm text-slate-400">
              Total {categories.length} categories found
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_120px]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <Search className="h-5 w-5 text-cyan-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search category..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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
              value={jackpot}
              onChange={(e) => setJackpot(e.target.value)}
              className={inputClass}
            >
              <option className="bg-[#030712]" value="">
                All Type
              </option>
              <option className="bg-[#030712]" value="true">
                Jackpot
              </option>
              <option className="bg-[#030712]" value="false">
                Normal
              </option>
            </select>

            <button
              onClick={loadCategories}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {listLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-slate-400">
            No categories found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-black/25 shadow-xl transition hover:-translate-y-1 hover:border-cyan-300/30"
              >
                <div className="relative h-44 bg-black/40">
                  {cat.bannerImage ? (
                    <img
                      src={fileUrl(cat.bannerImage)}
                      alt={cat.categoryName?.en}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600">
                      <ImagePlus className="h-10 w-10" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {cat.iconImage && (
                    <div className="absolute left-3 top-3 h-12 w-12 overflow-hidden rounded-2xl border border-cyan-300/40 bg-black/60 p-1">
                      <img
                        src={fileUrl(cat.iconImage)}
                        alt="Icon"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="absolute right-3 top-3 rounded-xl bg-cyan-300/90 px-3 py-1 text-xs font-black text-black">
                    #{cat.order || 0}
                  </div>

                  {cat.jackpot && (
                    <div className="absolute right-3 top-11 rounded-xl bg-emerald-500 px-3 py-1 text-xs font-black text-white">
                      ★ JACKPOT
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3">
                    <span
                      className={`rounded-xl px-3 py-1 text-xs font-black ${
                        cat.status === "active"
                          ? "bg-emerald-500/90 text-white"
                          : "bg-red-500/90 text-white"
                      }`}
                    >
                      {cat.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="truncate text-lg font-black text-cyan-100">
                    {cat.categoryName?.en || "—"}
                  </h3>

                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {cat.categoryTitle?.en || "No title"}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    BN: {cat.categoryName?.bn || "—"}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => startEdit(cat)}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(cat._id)}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-200 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>

                  <p className="mt-4 truncate text-[11px] text-slate-600">
                    ID: {cat._id}
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
            <p className="text-sm font-black text-slate-100">
              Click to upload
            </p>
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

export default RBAddCategory;