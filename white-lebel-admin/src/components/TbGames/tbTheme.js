/* ------------------------------------------------------------------
   TBAJEE38 (TB) — constants and helpers shared by the TB admin pages.
------------------------------------------------------------------ */

const API_URL = import.meta.env.VITE_API_URL;

export const fileUrl = (path = "") => {
  if (!path) return "";
  if (String(path).startsWith("http") || String(path).startsWith("blob:")) return path;
  return `${API_URL}${String(path).startsWith("/") ? path : `/${path}`}`;
};

export const apiError = (error, fallback = "Operation failed") =>
  error?.response?.data?.message || fallback;

export const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-fuchsia-300/60";

export const labelClass = "mb-2 block text-sm font-bold text-slate-200";

export const cardClass =
  "rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-6";

export const btnGhost =
  "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary =
  "flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-[0_18px_50px_rgba(188,67,244,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60";

export const btnDanger =
  "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-50";

/* TBAJEE38's own colours, for the site look-alikes. */
export const SITE = {
  page: "#010928",
  header: "#0F0238",
  card: "#241A3E",
  accent: "#BC43F4",
  gold: "#FBD029",
};
