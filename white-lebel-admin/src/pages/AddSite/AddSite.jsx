import React, { useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Globe2,
  ImagePlus,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
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
  const [tokenModal, setTokenModal] = useState(null);

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

  const copyText = async (text, label = "Text") => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
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

      const res = await api.post("/api/master/sites", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = res.data?.data;

      toast.success("Site added successfully");

      setTokenModal({
        siteName: data?.site?.siteName || formData.siteName,
        clientUrl: data?.site?.clientUrl || formData.clientUrl,
        apiToken: data?.apiToken || "",
      });

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
                  Token generated automatically
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
            <InputBox
              label="Site Name *"
              icon={Globe2}
              name="siteName"
              value={formData.siteName}
              onChange={handleChange}
              placeholder="MYGP Clone 1"
              className="md:col-span-2"
            />

            <InputBox
              label="Client Site URL *"
              icon={Link2}
              name="clientUrl"
              value={formData.clientUrl}
              onChange={handleChange}
              placeholder="https://mygp-live.com"
            />

            <InputBox
              label="Admin Login URL *"
              icon={Link2}
              name="adminLoginUrl"
              value={formData.adminLoginUrl}
              onChange={handleChange}
              placeholder="https://admin.mygp-live.com/login"
              iconColor="text-emerald-300"
              focusColor="focus-within:border-emerald-300/60"
            />

            <InputBox
              label="Admin Email *"
              icon={Mail}
              type="email"
              name="adminEmail"
              value={formData.adminEmail}
              onChange={handleChange}
              placeholder="admin@site.com"
            />

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

          <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-cyan-300" />
              <div>
                <p className="text-sm font-black text-cyan-100">
                  API Token Auto Generate
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Site save korar por 16-22 character er API token modal e show
                  hobe. Ei token child admin panel e add korlei master panel
                  theke game data access korte parbe.
                </p>
              </div>
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
                  Save Site & Generate Token
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

              <p>
                <span className="text-slate-500">Token:</span>{" "}
                <span className="text-cyan-200">Auto generated after save</span>
              </p>
            </div>
          </div>
        </div>
      </form>

      {tokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/10 bg-[#030712] shadow-2xl">
            <div className="relative p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_35%)]" />

              <div className="relative">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
                      <KeyRound className="h-7 w-7" />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        API Token Generated
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Copy this token and save it safely.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTokenModal(null)}
                    className="cursor-pointer rounded-xl bg-white/10 p-2 text-slate-300 hover:bg-white/15 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-200/80">
                    Site
                  </p>

                  <p className="mt-1 text-lg font-black text-emerald-100">
                    {tokenModal.siteName}
                  </p>

                  <p className="mt-1 break-all text-xs text-slate-400">
                    {tokenModal.clientUrl}
                  </p>
                </div>

                <div className="mt-4 rounded-3xl border border-cyan-300/20 bg-black/35 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-200/80">
                    White Label API Token
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/50 px-4 py-3">
                      <p className="break-all font-mono text-sm font-black text-cyan-100">
                        {tokenModal.apiToken || "Token not found"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyText(tokenModal.apiToken, "API Token")}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3 text-sm font-black text-white"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Token
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
                  <p className="text-sm font-black text-yellow-100">
                    Important
                  </p>
                  <p className="mt-1 text-xs leading-5 text-yellow-100/80">
                    Ei token ta child admin panel e add korben. Token change
                    korle old token automatic kaj korbe na.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setTokenModal(null)}
                  className="mt-5 w-full cursor-pointer rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-slate-100 hover:bg-white/15"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputBox = ({
  label,
  icon: Icon,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  className = "",
  iconColor = "text-cyan-300",
  focusColor = "focus-within:border-cyan-300/60",
}) => {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-bold text-slate-200">
        {label}
      </label>

      <div
        className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition ${focusColor}`}
      >
        <Icon className={`h-5 w-5 ${iconColor}`} />

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
        />
      </div>
    </div>
  );
};

export default AddSite;
