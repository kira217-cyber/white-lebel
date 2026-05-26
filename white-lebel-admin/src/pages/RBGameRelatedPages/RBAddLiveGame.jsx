import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  Gamepad2,
  Save,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Copy,
  Loader2,
} from "lucide-react";
import { api } from "../../api/axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const defaultForm = {
  gameUID: "",
  isActive: true,
  openInNewTab: true,
  note: "",
};

const RBAddLiveGame = () => {
  const [formData, setFormData] = useState(defaultForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/api/master-rb-live-game");

      const config = data?.data || {};

      setFormData({
        gameUID: config?.gameUID || "",
        isActive: config?.isActive !== false,
        openInNewTab: config?.openInNewTab !== false,
        note: config?.note || "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load live game config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validate = () => {
    if (!String(formData.gameUID || "").trim()) {
      toast.error("Game UID is required");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      await api.put("/api/master-rb-live-game", {
        gameUID: String(formData.gameUID || "").trim(),
        isActive: !!formData.isActive,
        openInNewTab: !!formData.openInNewTab,
        note: String(formData.note || "").trim(),
      });

      toast.success("Live game updated successfully");

      await loadConfig();
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = useMemo(() => {
    return `/playgame/${formData.gameUID || "GAME_UID"}`;
  }, [formData.gameUID]);

  const copyUID = async () => {
    try {
      await navigator.clipboard.writeText(formData.gameUID || "");
      toast.success("Game UID copied");
    } catch (error) {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,121,201,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.25),transparent_35%)]" />

      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-5xl"
        >
          {/* HEADER */}
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/30 bg-white/10 shadow-[0_0_45px_rgba(34,211,238,0.25)] backdrop-blur">
                <Gamepad2 className="h-10 w-10 text-cyan-300" />
              </div>

              <h1 className="bg-gradient-to-r from-cyan-200 via-emerald-200 to-blue-300 bg-clip-text text-3xl font-black text-transparent md:text-5xl">
                RB Live Game Controller
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Control all white label live cricket game redirects from one
                master panel.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={loadConfig}
                disabled={loading}
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-5 w-5" />
                )}
                Reload
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-6 py-3 text-sm font-black text-white shadow-[0_18px_50px_rgba(34,211,238,0.20)] transition hover:scale-[1.01] disabled:opacity-60"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full" />

                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Config
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* LEFT */}
            <div className="rounded-[32px] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl md:p-8">
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 px-4 py-3">
                <Sparkles className="h-5 w-5 text-cyan-300" />

                <div>
                  <h2 className="text-sm font-bold text-white">
                    Global Live Game Settings
                  </h2>

                  <p className="text-xs text-slate-300">
                    Every live match will redirect to this game UID.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* UID */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Global Game UID
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 focus-within:border-cyan-300/60">
                    <ShieldCheck className="h-5 w-5 text-cyan-300" />

                    <input
                      type="text"
                      value={formData.gameUID}
                      onChange={(e) => handleChange("gameUID", e.target.value)}
                      placeholder="69987ca39fa20f5dfecbdc95"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />

                    <button
                      type="button"
                      onClick={copyUID}
                      className="cursor-pointer text-slate-400 transition hover:text-white"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* STATUS */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Live Game Status
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        handleChange("isActive", !formData.isActive)
                      }
                      className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                        formData.isActive
                          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                          : "border-red-400/30 bg-red-500/15 text-red-300"
                      }`}
                    >
                      {formData.isActive ? (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          ACTIVE
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5" />
                          INACTIVE
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Open Mode
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        handleChange("openInNewTab", !formData.openInNewTab)
                      }
                      className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                        formData.openInNewTab
                          ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-300"
                          : "border-yellow-400/30 bg-yellow-500/15 text-yellow-300"
                      }`}
                    >
                      <ExternalLink className="h-5 w-5" />

                      {formData.openInNewTab ? "NEW TAB ENABLED" : "SAME TAB"}
                    </button>
                  </div>
                </div>

                {/* NOTE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Admin Note
                  </label>

                  <textarea
                    rows={5}
                    value={formData.note}
                    onChange={(e) => handleChange("note", e.target.value)}
                    placeholder="Optional internal note..."
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white outline-none transition focus:border-emerald-300/60"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              {/* PREVIEW */}
              <div className="rounded-[32px] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
                    <Gamepad2 className="h-6 w-6 text-emerald-300" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">
                      Live Preview
                    </h3>

                    <p className="text-xs text-slate-400">
                      Frontend redirect preview
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-300/10 bg-black/40 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Redirect URL
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black ${
                        formData.isActive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {formData.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  <div className="break-all rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-bold text-cyan-200">
                    {previewUrl}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-400">Open Mode</p>

                      <p className="mt-1 text-sm font-bold text-white">
                        {formData.openInNewTab
                          ? "New Browser Tab"
                          : "Current Browser Tab"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-400">Current UID</p>

                      <p className="mt-1 break-all text-sm font-bold text-emerald-300">
                        {formData.gameUID || "No UID Selected"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* INFO */}
              <div className="rounded-[32px] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl">
                <h3 className="mb-4 text-lg font-black text-white">
                  System Behavior
                </h3>

                <div className="space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl border border-cyan-300/10 bg-cyan-400/5 p-4">
                    • All live cricket matches will redirect to the same global
                    game UID.
                  </div>

                  <div className="rounded-xl border border-emerald-300/10 bg-emerald-400/5 p-4">
                    • White label sites automatically receive updates from this
                    master panel.
                  </div>

                  <div className="rounded-xl border border-yellow-300/10 bg-yellow-400/5 p-4">
                    • If inactive, frontend can disable live game clicking.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RBAddLiveGame;
