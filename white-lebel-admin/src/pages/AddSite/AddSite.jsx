import React, { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Globe2,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";

const initialForm = {
  siteName: "",
  clientUrl: "",
  adminLoginUrl: "",
  adminEmail: "",
  adminPassword: "",
  note: "",
  status: "active",
};

const AddSite = () => {
  const [formData, setFormData] = useState(initialForm);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      formData.siteName.trim() &&
      formData.clientUrl.trim() &&
      formData.adminLoginUrl.trim() &&
      formData.adminEmail.trim() &&
      formData.adminPassword.trim()
    );
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Only image file allowed");
    }

    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleReset = () => {
    setFormData(initialForm);
    setLogo(null);
    setLogoPreview("");
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit) {
      return toast.error("Please fill all required fields");
    }

    try {
      setSubmitting(true);

      const payload = new FormData();

      payload.append("siteName", formData.siteName);
      payload.append("clientUrl", formData.clientUrl);
      payload.append("adminLoginUrl", formData.adminLoginUrl);
      payload.append("adminEmail", formData.adminEmail);
      payload.append("adminPassword", formData.adminPassword);
      payload.append("note", formData.note);
      payload.append("status", formData.status);

      if (logo) {
        payload.append("logo", logo);
      }

      await api.post("/api/master/sites", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Site added successfully");
      handleReset();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add site");
    } finally {
      setSubmitting(false);
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
              Add New{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                White Label Site
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Add your MYGP clone site admin login URL, client URL and admin
              credentials in one secure master panel.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="text-sm font-black text-emerald-100">
                  Master Control
                </p>
                <p className="text-xs text-emerald-200/80">
                  Create once, access anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]"
      >
        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black">Site Information</h2>
              <p className="text-sm text-slate-400">
                Required fields are marked with *
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Site Name *
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-cyan-300/60">
                <Globe2 className="h-5 w-5 text-cyan-300" />

                <input
                  name="siteName"
                  value={formData.siteName}
                  onChange={handleChange}
                  placeholder="MYGP Clone 1"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Client Site URL *
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-cyan-300/60">
                <Link2 className="h-5 w-5 text-cyan-300" />

                <input
                  name="clientUrl"
                  value={formData.clientUrl}
                  onChange={handleChange}
                  placeholder="https://mygp-live.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Admin Login URL *
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-emerald-300/60">
                <Link2 className="h-5 w-5 text-emerald-300" />

                <input
                  name="adminLoginUrl"
                  value={formData.adminLoginUrl}
                  onChange={handleChange}
                  placeholder="https://admin.mygp-live.com/login"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Admin Email *
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-cyan-300/60">
                <Mail className="h-5 w-5 text-cyan-300" />

                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@site.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Admin Password *
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-emerald-300/60">
                <Lock className="h-5 w-5 text-emerald-300" />

                <input
                  type={showPassword ? "text" : "password"}
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  placeholder="Enter admin password"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="cursor-pointer text-slate-300 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Status
              </label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full cursor-pointer rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
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
              <label className="mb-2 block text-sm font-bold text-slate-200">
                Note
              </label>

              <input
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Optional note"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="group relative flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_50px_rgba(34,211,238,0.20)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full" />

              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving Site...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Site
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer rounded-2xl border border-white/10 bg-white/10 px-5 py-3.5 text-sm font-black text-slate-200 transition hover:bg-white/15"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
              <ImagePlus className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black">Site Logo</h2>
              <p className="text-sm text-slate-400">PNG, JPG, WEBP, SVG</p>
            </div>
          </div>

          <label className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-cyan-300/30 bg-black/25 p-6 text-center transition hover:border-cyan-300/60 hover:bg-cyan-300/5">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo Preview"
                className="max-h-40 max-w-full rounded-2xl object-contain"
              />
            ) : (
              <>
                <UploadCloud className="mb-4 h-12 w-12 text-cyan-300" />
                <p className="text-sm font-black text-slate-100">
                  Click to upload logo
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Max recommended size 5MB
                </p>
              </>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </label>

          <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4">
            <p className="text-sm font-black text-cyan-100">Preview Info</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <p>
                <span className="text-slate-500">Site:</span>{" "}
                {formData.siteName || "Not set"}
              </p>
              <p>
                <span className="text-slate-500">Client:</span>{" "}
                {formData.clientUrl || "Not set"}
              </p>
              <p>
                <span className="text-slate-500">Admin:</span>{" "}
                {formData.adminEmail || "Not set"}
              </p>
              <p>
                <span className="text-slate-500">Status:</span>{" "}
                <span
                  className={
                    formData.status === "active"
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                >
                  {formData.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddSite;
