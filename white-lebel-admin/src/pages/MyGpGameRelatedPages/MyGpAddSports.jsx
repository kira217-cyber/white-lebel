import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FaSyncAlt,
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaImage,
  FaFutbol,
  FaSearch,
} from "react-icons/fa";
import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL;

const emptyForm = {
  name_bn: "",
  name_en: "",
  gameId: "",
  order: 0,
  isActive: true,
};

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-cyan-300/60";

const fileUrl = (path = "") => {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? path : `/${path}`}`;
};

const MyGpAddSports = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [list, setList] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [syncFilter, setSyncFilter] = useState("");

  const [iconFile, setIconFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [oldImage, setOldImage] = useState("");
  const [removeOldImage, setRemoveOldImage] = useState(false);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    title: "",
  });

  const isEditMode = Boolean(editingId);

  const fetchSports = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.get("/api/master/mygp-sports", {
        params: {
          search,
          isActive: activeFilter,
          syncStatus: syncFilter,
          limit: 200,
        },
      });

      setList(res.data?.data?.sports || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load sports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSports(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter, syncFilter]);

  useEffect(() => {
    if (iconFile instanceof File) {
      const url = URL.createObjectURL(iconFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }

    setPreview(oldImage ? fileUrl(oldImage) : "");
  }, [iconFile, oldImage]);

  const resetForm = () => {
    setEditingId("");
    setForm(emptyForm);
    setIconFile(null);
    setPreview("");
    setOldImage("");
    setRemoveOldImage(false);
  };

  const onChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIconFile(file);
    setRemoveOldImage(false);
  };

  const removeImage = () => {
    setIconFile(null);
    setPreview("");

    if (oldImage) {
      setOldImage("");
      setRemoveOldImage(true);
    }
  };

  const onEdit = (row) => {
    setEditingId(row._id);

    setForm({
      name_bn: row?.name?.bn || "",
      name_en: row?.name?.en || "",
      gameId: row?.gameId || "",
      order: Number(row?.order || 0),
      isActive: row?.isActive !== false,
    });

    setIconFile(null);
    setOldImage(row?.iconImage || "");
    setRemoveOldImage(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const validate = () => {
    if (!String(form.name_bn || "").trim()) {
      return "Bangla sport name is required";
    }

    if (!String(form.name_en || "").trim()) {
      return "English sport name is required";
    }

    if (!String(form.gameId || "").trim()) {
      return "Game ID is required";
    }

    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const err = validate();

    if (err) {
      toast.error(err);
      return;
    }

    try {
      setSaving(true);

      const payload = new FormData();

      payload.append("name_bn", String(form.name_bn || "").trim());
      payload.append("name_en", String(form.name_en || "").trim());
      payload.append("gameId", String(form.gameId || "").trim());
      payload.append("order", String(form.order || 0));
      payload.append("isActive", String(Boolean(form.isActive)));

      if (iconFile instanceof File) {
        payload.append("iconImage", iconFile);
      }

      if (isEditMode) {
        payload.append("removeOldImage", removeOldImage ? "true" : "false");

        const res = await api.put(
          `/api/master/mygp-sports/${editingId}`,
          payload,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        toast.success(res?.data?.message || "Sport updated successfully");
      } else {
        const res = await api.post("/api/master/mygp-sports", payload, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        toast.success(res?.data?.message || "Sport created successfully");
      }

      resetForm();
      fetchSports(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (row) => {
    setDeleteModal({
      open: true,
      id: row._id,
      title: row?.name?.en || "Sport",
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      id: null,
      title: "",
    });
  };

  const confirmDelete = async () => {
    try {
      const res = await api.delete(`/api/master/mygp-sports/${deleteModal.id}`);

      toast.success(res?.data?.message || "Sport deleted successfully");

      if (editingId === deleteModal.id) {
        resetForm();
      }

      closeDeleteModal();
      fetchSports(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  const totalSports = useMemo(() => list.length, [list]);

  const activeSports = useMemo(
    () => list.filter((item) => item.isActive !== false).length,
    [list],
  );

  return (
    <div className="space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
              <FaFutbol className="text-3xl" />
            </div>

            <div>
              <h1 className="text-3xl font-black md:text-4xl">
                MyGP{" "}
                <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                  Sports
                </span>
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Sports name, icon, game ID, order এবং active status manage করুন।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fetchSports(true)}
              disabled={loading || refreshing}
              className="flex cursor-pointer items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-60"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3 text-sm font-black text-white"
            >
              <FaPlus />
              New Sport
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5">
          <p className="text-sm font-bold text-slate-400">Total Sports</p>
          <h2 className="mt-2 text-3xl font-black">{totalSports}</h2>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5">
          <p className="text-sm font-bold text-slate-400">Active Sports</p>
          <h2 className="mt-2 text-3xl font-black text-emerald-300">
            {activeSports}
          </h2>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">
                {isEditMode ? "Update Sport" : "Create Sport"}
              </h2>
              <p className="text-sm text-slate-400">
                BN/EN name with game ID and icon
              </p>
            </div>

            {isEditMode && (
              <button
                type="button"
                onClick={resetForm}
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/20"
              >
                <FaTimes />
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Sport Name Bangla *
              </label>
              <input
                type="text"
                value={form.name_bn}
                onChange={(e) => onChange("name_bn", e.target.value)}
                placeholder="যেমন: ফুটবল"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Sport Name English *
              </label>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => onChange("name_en", e.target.value)}
                placeholder="e.g. Football"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Game ID *
              </label>
              <input
                type="text"
                value={form.gameId}
                onChange={(e) => onChange("gameId", e.target.value)}
                placeholder="Enter game id"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Order
              </label>
              <input
                type="number"
                min="0"
                value={form.order}
                onChange={(e) => onChange("order", e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Status
              </label>
              <select
                value={String(form.isActive)}
                onChange={(e) =>
                  onChange("isActive", e.target.value === "true")
                }
                className={inputClass}
              >
                <option className="bg-[#030712]" value="true">
                  Active
                </option>
                <option className="bg-[#030712]" value="false">
                  Inactive
                </option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Icon Image
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/30 bg-black/30 p-5 text-center transition hover:border-cyan-300/60 hover:bg-cyan-300/5">
                <FaImage className="mb-3 text-4xl text-cyan-300" />
                <span className="text-sm font-black text-slate-100">
                  Click to upload sport icon
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  PNG, JPG, WEBP, SVG, AVIF, GIF
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>

              {preview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="mt-3 flex cursor-pointer items-center gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-500/10 px-4 py-2 text-sm font-black text-yellow-100 hover:bg-yellow-500/20"
                >
                  <FaTimes />
                  Remove Image
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isEditMode ? <FaSave /> : <FaPlus />}
            {saving
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Update Sport"
                : "Create Sport"}
          </button>
        </form>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
          <h2 className="text-xl font-black">Live Preview</h2>

          <div className="mt-5 rounded-[28px] border border-white/10 bg-black/30 p-6 text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-cyan-300/30 bg-black/40">
              {preview ? (
                <img
                  src={preview}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <FaFutbol className="text-4xl text-cyan-300" />
              )}
            </div>

            <h3 className="mt-5 text-lg font-black text-cyan-100">
              {form.name_en || "Sport Name"}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              {form.name_bn || "স্পোর্ট নাম"}
            </p>

            <div className="mt-4 flex justify-center gap-2">
              <span className="rounded-xl bg-cyan-300/90 px-3 py-1 text-xs font-black text-black">
                Order: {form.order || 0}
              </span>

              <span
                className={`rounded-xl px-3 py-1 text-xs font-black ${
                  form.isActive
                    ? "bg-emerald-500/90 text-white"
                    : "bg-red-500/90 text-white"
                }`}
              >
                {form.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <p className="mt-3 break-all font-mono text-xs text-slate-500">
              {form.gameId || "Game ID"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-xl font-black">MyGP Sports</h2>
            <p className="text-sm text-slate-400">
              Total {list.length} sports found
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_120px]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <FaSearch className="text-cyan-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sport..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className={inputClass}
            >
              <option className="bg-[#030712]" value="">
                All Status
              </option>
              <option className="bg-[#030712]" value="true">
                Active
              </option>
              <option className="bg-[#030712]" value="false">
                Inactive
              </option>
            </select>

            <select
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value)}
              className={inputClass}
            >
              <option className="bg-[#030712]" value="">
                Sync All
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
              onClick={() => fetchSports(true)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center text-slate-400">
            Loading sports...
          </div>
        ) : list.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {list.map((row) => (
              <div
                key={row._id}
                className="rounded-[28px] border border-white/10 bg-black/25 p-5 shadow-xl transition hover:-translate-y-1 hover:border-cyan-300/30"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/30 bg-black/40">
                    {row.iconImage ? (
                      <img
                        src={fileUrl(row.iconImage)}
                        alt={row?.name?.en || "sport"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FaFutbol className="text-3xl text-cyan-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black text-cyan-100">
                      {row?.name?.en || "—"}
                    </h3>

                    <p className="mt-1 truncate text-sm text-slate-400">
                      {row?.name?.bn || "—"}
                    </p>

                    <p className="mt-2 break-all text-xs text-slate-500">
                      Game ID: {row?.gameId || "—"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Order: {Number(row?.order || 0)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-xl px-3 py-1 text-xs font-black ${
                          row?.isActive !== false
                            ? "bg-emerald-500/90 text-white"
                            : "bg-red-500/90 text-white"
                        }`}
                      >
                        {row?.isActive !== false ? "ACTIVE" : "INACTIVE"}
                      </span>

                      <span
                        className={`rounded-xl px-3 py-1 text-xs font-black ${
                          row?.syncStatus === "synced"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : row?.syncStatus === "failed"
                              ? "bg-red-500/20 text-red-200"
                              : "bg-yellow-500/20 text-yellow-100"
                        }`}
                      >
                        {row?.syncStatus || "pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
                  >
                    <FaEdit />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => openDeleteModal(row)}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/20"
                  >
                    <FaTrash />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-slate-400">
            No sports found.
          </div>
        )}
      </section>

      {deleteModal.open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-400/30 bg-gradient-to-br from-black via-red-950/20 to-black p-6 shadow-2xl">
            <h3 className="text-2xl font-black text-white">Confirm Delete</h3>

            <p className="mt-3 text-red-100/85">
              তুমি কি নিশ্চিত{" "}
              <span className="font-bold text-white">{deleteModal.title}</span>{" "}
              sport delete করতে চাও?
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                className="flex cursor-pointer items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-500"
              >
                <FaTrash />
                Yes, Delete
              </button>

              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white hover:bg-white/15"
              >
                <FaTimes />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyGpAddSports;
